const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const prisma = require('./config/prisma');

let server;

const startServer = async () => {
    try {
        // Verify Prisma can connect to PostgreSQL
        await prisma.$connect();
        logger.info('Connected to PostgreSQL via Prisma');

        server = app.listen(config.port, () => {
            logger.info(`Listening to port: ${config.port}`);
        });
    } catch (error) {
        logger.error('Unable to connect to PostgreSQL:', error);
        process.exit(1);
    }
};

startServer();

const exitHandler = async () => {
    await prisma.$disconnect();
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await prisma.$disconnect();
    if (server) {
        server.close();
    }
});
