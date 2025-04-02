import { Request, Response, NextFunction } from "express";
import { logger } from "../../structures";

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
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
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
