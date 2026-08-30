import mongoose from "mongoose";
import logger from "../structures/Logger";

export class Database {
	private static isConnected = false;

	public static async connect(): Promise<void> {
		if (this.isConnected) return;

		const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/anarchy-bot";

		try {
			await mongoose.connect(uri, {
				serverSelectionTimeoutMS: 5000,
				autoIndex: true,
			});
			this.isConnected = true;
			logger.start("MongoDB connected successfully.");
		} catch (error) {
			logger.error(`MongoDB connection error: ${error}`);
		}

		mongoose.connection.on("error", (err) => {
			logger.error(`MongoDB runtime error: ${err}`);
		});

		mongoose.connection.on("disconnected", () => {
			this.isConnected = false;
			logger.warn("MongoDB disconnected. Attempting to reconnect...");
		});
	}

	public static async disconnect(): Promise<void> {
		if (!this.isConnected) return;
		await mongoose.disconnect();
		this.isConnected = false;
		logger.info("MongoDB disconnected gracefully.");
	}
}

export * from "./models";
