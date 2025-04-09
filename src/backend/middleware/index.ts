import { Request, Response, NextFunction } from "express";
import { logger } from "../../structures";
import rateLimit from "express-rate-limit";

// Rate limiting middleware
export const rateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	message: {
		status: "error",
		message: "Too many requests, please try again later."
	},
	handler: (req: Request, res: Response) => {
		logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
		res.status(429).json({
			status: "error",
			message: "Too many requests, please try again later."
		});
	}
});

// Logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
	logger.info(`${req.method} ${req.path}`);
	const start = Date.now();

	res.on('finish', () => {
		const duration = Date.now() - start;
		logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
	});

	next();
};

// Error handling middleware
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
	logger.error(`Error: ${err.message}`);
	logger.error(err.stack);

	res.status(500).json({
		status: "error",
		message: "Internal Server Error",
		error: process.env.NODE_ENV === "production" ? undefined : err.message
	});
};

// Auth middleware
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const apiKey = req.header('X-API-Key');

	if (!apiKey || apiKey !== process.env.API_KEY) {
		return void res.status(401).json({
			status: "error",
			message: "Unauthorized"
		});
	}

	next();
};
