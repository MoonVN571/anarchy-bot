import express, { Application } from "express";
import { Discord, logger } from "../structures";
import { setupRoutes } from "./routes";
import { errorHandler, requestLogger } from "./middleware";

export class Express {
	private express: Application;
	private discordClient: Discord;

	constructor(discordClient: Discord) {
		this.discordClient = discordClient;
		this.express = express();

		// Configure middleware
		this.express.use(express.json());
		this.express.use(express.urlencoded({ extended: true }));
		this.express.use(requestLogger);

		// Setup routes
		setupRoutes(this.express, this.discordClient);

		// Error handling middleware (must be after routes)
		this.express.use(errorHandler);

		// Start server
		this.express.listen(process.env.PORT || 3000, () => {
			logger.start(`Server started on port ${process.env.PORT || 3000}`);
		});
	}
}