/**
 * @file logger.js
 * @description Winston logging instance configuration for console and error outputs.
 */

const winston = require('winston');
const config = require('./config');

/**
 * Winston custom error formatter for extracting stack traces.
 */
const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

/**
 * Configured Winston logger instance.
 */
const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        enumerateErrorFormat(),
        config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
        winston.format.splat(),
        winston.format.printf(({ level, message }) => `${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
    ],
});

module.exports = logger;