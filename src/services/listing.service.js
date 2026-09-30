
const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');
const currencyService = require('./currency.service');


// Price arrives in the SELLER's own currency and is stored as USD.
// Any listing returned to a viewer gets a `display` block in the viewer's currency.
const withDisplay = (listing, viewerCurrency) =>
    currencyService.attachDisplay(listing, ['price'], viewerCurrency);

const createListing = async (userId, data) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });

    const isPublic = data.isPublic !== undefined ? data.isPublic : user.role === 'BUSINESS';
    const sellerCurrency = await currencyService.getUserCurrency(userId);
    const priceUsd = await currencyService.toUsd(data.price, sellerCurrency.currencyCode);

    const listing = await prisma.listing.create({
        data: { businessId: userId, ...data, price: priceUsd, isPublic },
    });

    await emailService.sendListingAddedEmail(user.email, listing.title);
    return withDisplay(listing, sellerCurrency);
};


const updateListing = async (businessId, listingId, data) => {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Listing not found');
    }
    if (listing.businessId !== businessId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not own this listing');
    }

    const sellerCurrency = await currencyService.getUserCurrency(businessId);
    const updateData = { ...data };
    if (data.price !== undefined) {
        updateData.price = await currencyService.toUsd(data.price, sellerCurrency.currencyCode);
    }

    const updated = await prisma.listing.update({ where: { id: listingId }, data: updateData });
    return withDisplay(updated, sellerCurrency);
};

const deleteListing = async (businessId, listingId) => {
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { _count: { select: { barterOffersFrom: true, barterOffersTarget: true, ordersFor: true } } },
    });

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Listing not found');
    }
    if (listing.businessId !== businessId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not own this listing');
    }

    const hasHistory =
        listing._count.barterOffersFrom > 0 || listing._count.barterOffersTarget > 0 || listing._count.ordersFor > 0;

    if (hasHistory) {
        // Can't hard-delete a listing with trade/offer history — soft-delete it
        // (isDeleted: true) so existing orders/offers keep a valid reference,
        // but hide it from the owner's "My Listings" and public browse.
        return prisma.listing.update({
            where: { id: listingId },
            data: { status: 'PAUSED', isDeleted: true },
        });
    }

    await prisma.listing.delete({ where: { id: listingId } });
};

const getListings = async (filters, viewerId) => {
    const { category, country, search, sort, page = 1, limit = 12 } = filters;
    let { minPrice, maxPrice } = filters;

    // The viewer types min/max in THEIR currency; listings are stored in USD.
    const viewerCurrency = await currencyService.getUserCurrency(viewerId);
    if (minPrice != null) minPrice = await currencyService.toUsd(minPrice, viewerCurrency.currencyCode);
    if (maxPrice != null) maxPrice = await currencyService.toUsd(maxPrice, viewerCurrency.currencyCode);

    const where = {
        status: 'ACTIVE',
        isPublic: true,
        isDeleted: false,
        ...(category && { category }),
        ...(country && { business: { businessProfile: { country } } }),
        ...(minPrice != null || maxPrice != null
            ? {
                price: {
                    ...(minPrice != null && { gte: minPrice }),
                    ...(maxPrice != null && { lte: maxPrice }),
                },
            }
            : {}),
        ...(search && {
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const orderBy =
        sort === 'priceAsc' ? { price: 'asc' } : sort === 'priceDesc' ? { price: 'desc' } : { createdAt: 'desc' };

    const [results, total] = await Promise.all([
        prisma.listing.findMany({
            where,
            include: {
                business: {
                    select: {
                        id: true,
                        name: true,
                        businessProfile: { select: { businessName: true, country: true, city: true } },
                    },
                },
            },
            orderBy,
            skip: (page - 1) * limit,
            take: Number(limit),
        }),
        prisma.listing.count({ where }),
    ]);

    return {
        results: results.map((listing) => withDisplay(listing, viewerCurrency)),
        currency: viewerCurrency.currencyCode,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

const getListingById = async (listingId, viewerId) => {
    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            business: {
                select: {
                    id: true,
                    name: true,
                    businessProfile: { select: { businessName: true, country: true, city: true, phone: true } },
                },
            },
        },
    });

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Listing not found');
    }
    const viewerCurrency = await currencyService.getUserCurrency(viewerId);
    return withDisplay(listing, viewerCurrency);
};

const getMyListings = async (businessId) => {
    const [listings, viewerCurrency] = await Promise.all([
        prisma.listing.findMany({
            where: { businessId, isDeleted: false },
            orderBy: { createdAt: 'desc' },
        }),
        currencyService.getUserCurrency(businessId),
    ]);
    return listings.map((listing) => withDisplay(listing, viewerCurrency));
};

module.exports = { createListing, updateListing, deleteListing, getListings, getListingById, getMyListings };