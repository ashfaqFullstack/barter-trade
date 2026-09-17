const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

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

    return prisma.barterOffer.create({
        data: {
            offererListingId,
            offererId,
            targetListingId,
            targetOwnerId: targetListing.businessId,
        },
    });
};

const acceptOffer = async (targetOwnerId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({ where: { id: offerId } });

    if (!offer) throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
    if (offer.targetOwnerId !== targetOwnerId) throw new ApiError(httpStatus.FORBIDDEN, 'This offer is not yours to accept');
    if (offer.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, 'Offer is no longer pending');

    return prisma.$transaction(async (tx) => {
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

const getOfferById = async (userId, offerId) => {
    const offer = await prisma.barterOffer.findUnique({
        where: { id: offerId },
        include: {
            offererListing: true,
            targetListing: true,
            offerer: { select: { id: true, name: true, businessProfile: { select: { businessName: true } } } },
            targetOwner: { select: { id: true, name: true, businessProfile: { select: { businessName: true } } } },
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