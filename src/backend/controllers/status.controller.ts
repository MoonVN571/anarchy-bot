
import { Request, Response } from "express";

export class StatusController {
	getStatus(req: Request, res: Response) {
		res.json({
			status: "online",
			timestamp: new Date().toISOString()
		});
	}

	healthCheck(req: Request, res: Response) {
		res.json({
			status: "healthy",
			uptime: process.uptime(),
			memory: process.memoryUsage()
		});
	}
}