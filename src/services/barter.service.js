const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const companyAccountService = require('./companyAccount.service');

const createOffer = async (offererId, offererListingId, targetListingId) => {
    const [offererListing, targetListing] = await Promise.all([
        prisma.listing.findUnique({ where: { id: offererListingId } }),
        prisma.listing.findUnique({ where: { id: targetListingId } }),
    ]);

    if (!offererListing || offererListing.businessId !== offererId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not own the offered listing');
    }
    if (!targetListing || targetListing.status !== 'ACTIVE') {
        throw new ApiError(httpStatus.NOT_FOUND, 'Target listing not available');
    }
    if (targetListing.businessId === offererId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot barter with your own listing');
    }
    if (offererListing.status !== 'ACTIVE') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Your listing must be active to make an offer');
    }

    const offer = await prisma.barterOffer.create({
        data: {
            offererListingId,
            offererId,
            targetListingId,
            targetOwnerId: targetListing.businessId,
        },
    });

    const [offerer, targetOwner] = await Promise.all([
        prisma.user.findUnique({ where: { id: offer.offererId }, select: { email: true } }),
        prisma.user.findUnique({ where: { id: offer.targetOwnerId }, select: { email: true } }),
    ]);
    await Promise.all([
        emailService.sendBarterOfferSentEmail(offerer.email),
        emailService.sendBarterOfferReceivedEmail(targetOwner.email),
    ]);

    return offer;
};

const acceptOffer = async (targetOwnerId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({ where: { id: offerId } });

    if (!offer) throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    if (offer.targetOwnerId !== targetOwnerId) throw new ApiError(httpStatus.FORBIDDEN, 'This offer is not yours to accept');
    if (offer.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, 'Offer is no longer pending');

    return prisma.$transaction(async (tx) => {
        const [offererListing, targetListing, wallets] = await Promise.all([
            tx.listing.findUnique({ where: { id: offer.offererListingId } }),
            tx.listing.findUnique({ where: { id: offer.targetListingId } }),
            tx.wallet.findMany({ where: { userId: { in: [offer.offererId, offer.targetOwnerId] } } }),
        ]);

        if (!offererListing || !targetListing) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Barter listings are no longer available');
        }

        const commissionPercent = config.trade.commissionPercent;
        const commissionBuyer = (Number(offererListing.price) * commissionPercent) / 100;
        const commissionSeller = (Number(targetListing.price) * commissionPercent) / 100;
        const offererWallet = wallets.find((wallet) => wallet.userId === offer.offererId);
        const targetOwnerWallet = wallets.find((wallet) => wallet.userId === offer.targetOwnerId);

        if (!offererWallet || !targetOwnerWallet) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Both users must have a wallet to accept a barter offer');
        }
        if (Number(offererWallet.balance) - commissionBuyer < -Number(offererWallet.creditLimit)
            || Number(targetOwnerWallet.balance) - commissionSeller < -Number(targetOwnerWallet.creditLimit)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient balance / credit limit for barter commission');
        }

        await Promise.all([
            tx.wallet.update({
                where: { userId: offer.offererId },
                data: { balance: { decrement: commissionBuyer } },
            }),
            tx.wallet.update({
                where: { userId: offer.targetOwnerId },
                data: { balance: { decrement: commissionSeller } },
            }),
        ]);
        await companyAccountService.creditCompanyAccount(tx, commissionBuyer + commissionSeller);
        await tx.monthlyFeeLog.createMany({
            data: [
                { userId: offer.offererId, amount: commissionBuyer, type: 'TRADE_COMMISSION' },
                { userId: offer.targetOwnerId, amount: commissionSeller, type: 'TRADE_COMMISSION' },
            ],
        });

        await tx.listing.update({ where: { id: offer.offererListingId }, data: { status: 'TRADED' } });
        await tx.listing.update({ where: { id: offer.targetListingId }, data: { status: 'TRADED' } });

        return tx.barterOffer.update({
            where: { id: offerId },
            data: { status: 'ACCEPTED', respondedAt: new Date() },
        });
    });
};

const rejectOffer = async (targetOwnerId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({ where: { id: offerId } });

    if (!offer) throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    if (offer.targetOwnerId !== targetOwnerId) throw new ApiError(httpStatus.FORBIDDEN, 'This offer is not yours to reject');
    if (offer.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, 'Offer is no longer pending');

    return prisma.barterOffer.update({
        where: { id: offerId },
        data: { status: 'REJECTED', respondedAt: new Date() },
    });
};

const cancelOffer = async (offererId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({ where: { id: offerId } });

    if (!offer) throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    if (offer.offererId !== offererId) throw new ApiError(httpStatus.FORBIDDEN, 'This offer is not yours to cancel');
    if (offer.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, 'Offer is no longer pending');

    return prisma.barterOffer.update({
        where: { id: offerId },
        data: { status: 'CANCELLED', respondedAt: new Date() },
    });
};

const getMyOffers = async (offererId) => {
    return prisma.barterOffer.findMany({
        where: { offererId },
        include: { offererListing: true, targetListing: true },
        orderBy: { createdAt: 'desc' },
    });
};

const getReceivedOffers = async (targetOwnerId) => {
    return prisma.barterOffer.findMany({
        where: { targetOwnerId },
        include: { offererListing: true, targetListing: true },
        orderBy: { createdAt: 'desc' },
    });
};

const profileSelect = {
    select: {
        id: true,
        name: true,
        role: true,
        businessProfile: { select: { businessName: true, city: true, address: true } },
        customerProfile: { select: { city: true, address: true } },
    },
};

const getOfferById = async (userId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({
        where: { id: offerId },
        include: {
            offererListing: true,
            targetListing: true,
            offerer: profileSelect,
            targetOwner: profileSelect,
        },
    });

    if (!offer) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    }
    if (offer.offererId !== userId && offer.targetOwnerId !== userId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this offer');
    }

    return offer;
};

module.exports = { createOffer, acceptOffer, rejectOffer, cancelOffer, getMyOffers, getReceivedOffers, getOfferById };