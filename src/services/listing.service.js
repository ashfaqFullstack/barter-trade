const httpStatus = require('http-status').default;
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const emailService = require('./email.service');


const createListing = async (userId, data) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });

    const isPublic = data.isPublic !== undefined ? data.isPublic : user.role === 'BUSINESS';

    const listing = await prisma.listing.create({
        data: { businessId: userId, ...data, isPublic },
    });

    await emailService.sendListingAddedEmail(user.email, listing.title);
    return listing;
};


const updateListing = async (businessId, listingId, data) => {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });

    if (!listing) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Listing not found');
    }
    if (listing.businessId !== businessId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You do not own this listing');
    }

    return prisma.listing.update({ where: { id: listingId }, data });
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
        // Can't hard-delete a listing with trade/offer history — archive it instead
        // so existing orders/offers keep a valid reference.
        return prisma.listing.update({ where: { id: listingId }, data: { status: 'PAUSED' } });
    }

    await prisma.listing.delete({ where: { id: listingId } });
};

const getListings = async (filters) => {
    const { category, country, minPrice, maxPrice, search, sort, page = 1, limit = 12 } = filters;

    const where = {
        status: 'ACTIVE',
        isPublic: true,
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
        results,
        page: Number(page),
        limit: Number(limit),
        totalResults: total,
        totalPages: Math.ceil(total / limit),
    };
};

const getListingById = async (listingId) => {
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
    return listing;
};

const getMyListings = async (businessId) => {
    return prisma.listing.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } });
};

module.exports = { createListing, updateListing, deleteListing, getListings, getListingById, getMyListings };