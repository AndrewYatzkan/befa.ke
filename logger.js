const winston = require('winston');

const logger = winston.createLogger({
	format: winston.format.json(),
	transports: [
		new winston.transports.File({ filename: `${__dirname}/logs/error.log`, level: 'error' }),
		new winston.transports.File({ filename: `${__dirname}/logs/info.log`, level: 'info' }),
		new winston.transports.File({ filename: `${__dirname}/logs/silly.log`, level: 'silly' })
	]
});

logger.add(new winston.transports.Console({
	format: winston.format.simple()
}));

module.exports = logger;