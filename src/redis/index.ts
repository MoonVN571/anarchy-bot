import Redis, { RedisOptions } from "ioredis";
import logger from "../structures/Logger";

export class RedisClient {
	private static instance: Redis | null = null;
	private static isConnected = false;

	public static getClient(): Redis | null {
		return this.instance;
	}

	public static async connect(): Promise<Redis | null> {
		if (this.instance && this.isConnected) return this.instance;

		const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
		const options: RedisOptions = {
			maxRetriesPerRequest: 3,
			retryStrategy(times) {
				const delay = Math.min(times * 1000, 5000);
				return delay;
			},
			lazyConnect: true,
		};

		try {
			this.instance = new Redis(redisUrl, options);

			this.instance.on("connect", () => {
				this.isConnected = true;
				logger.start("Redis connected successfully.");
			});

			this.instance.on("error", (err) => {
				this.isConnected = false;
				logger.warn(`Redis connection error (cache may be degraded): ${err.message}`);
			});

			this.instance.on("close", () => {
				this.isConnected = false;
			});

			await this.instance.connect().catch((err) => {
				logger.warn(`Redis initial connect failed: ${err.message}. Bot will operate without Redis cache.`);
			});

			return this.instance;
		} catch (error: any) {
			logger.warn(`Redis setup exception: ${error.message}. Running without Redis.`);
			return null;
		}
	}

	public static async disconnect(): Promise<void> {
		if (this.instance) {
			await this.instance.quit();
			this.instance = null;
			this.isConnected = false;
			logger.info("Redis disconnected gracefully.");
		}
	}

	public static get ready(): boolean {
		return this.isConnected && this.instance?.status === "ready";
	}
}

export * from "./RedisManager";
