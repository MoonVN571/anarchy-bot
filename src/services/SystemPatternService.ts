import { SystemPatternModel, ISystemPattern } from "../database/models/SystemPatternModel";
import { defaultSystemPatterns } from "../utils/defaultSystemPatterns";
import { RedisManager } from "../redis/RedisManager";
import { RedisClient } from "../redis";
import logger from "../structures/Logger";

export class SystemPatternService {
	private static seeded = false;

	/**
	 * Seed default system patterns into DB on startup if empty
	 */
	public static async seedDefaults(): Promise<void> {
		if (this.seeded) return;
		try {
			const count = await SystemPatternModel.countDocuments();
			if (count === 0) {
				logger.info("[SystemPatternService] Seeding default system patterns into MongoDB...");
				for (const p of defaultSystemPatterns) {
					await SystemPatternModel.create({
						...p,
						enabled: true,
						confirmedBy: "system_seed",
					});
				}
				logger.info(`[SystemPatternService] Successfully seeded ${defaultSystemPatterns.length} system patterns.`);
			}
			this.seeded = true;
		} catch (err) {
			logger.error(`[SystemPatternService] Error seeding system patterns: ${err}`);
		}
	}

	private static memoryCache: Map<string, { regex: RegExp; doc: ISystemPattern }[]> = new Map();

	/**
	 * Synchronously check if a text matches any active system pattern (DB/Redis cache + defaults)
	 */
	public static isSystemMessageSync(server: string, text: string): boolean {
		if (!text) return false;
		const clean = text.trim();
		const s = server.toLowerCase();

		const cached = this.memoryCache.get(s) || this.memoryCache.get("global");
		if (cached && cached.length > 0) {
			for (const { regex } of cached) {
				if (regex.test(clean)) return true;
			}
		}

		for (const p of defaultSystemPatterns) {
			try {
				if (new RegExp(p.pattern, "i").test(clean)) return true;
			} catch {
				// Ignore
			}
		}
		return false;
	}

	/**
	 * Get compiled regex list for a server (from Redis cache or MongoDB + defaults fallback)
	 */
	public static async getPatternsForServer(server: string): Promise<{ regex: RegExp; doc: ISystemPattern }[]> {
		await this.seedDefaults();
		const s = server.toLowerCase();

		if (this.memoryCache.has(s) && this.memoryCache.get(s)!.length > 0) {
			return this.memoryCache.get(s)!;
		}

		let rawPatterns: any[] | null = null;
		const redis = RedisClient.getClient();

		if (redis && RedisClient.ready) {
			try {
				const cached = await redis.get(`anarchy:${server}:system_patterns`);
				if (cached) {
					rawPatterns = JSON.parse(cached);
				}
			} catch {
				// Fallback to mongo
			}
		}

		if (!rawPatterns || rawPatterns.length === 0) {
			rawPatterns = await SystemPatternModel.find({
				$or: [{ serverScope: "global" }, { serverScope: server }],
				enabled: true,
			})
				.sort({ priority: -1, createdAt: -1 })
				.lean();

			if (rawPatterns && rawPatterns.length > 0 && redis && RedisClient.ready) {
				redis.setex(`anarchy:${server}:system_patterns`, 3600, JSON.stringify(rawPatterns)).catch(() => {});
			}
		}

		// Compile patterns into RegExp
		const compiled: { regex: RegExp; doc: ISystemPattern }[] = [];
		for (const p of rawPatterns || []) {
			try {
				const regex = new RegExp(p.pattern, "i");
				compiled.push({ regex, doc: p as ISystemPattern });
			} catch {
				// Skip invalid
			}
		}

		this.memoryCache.set(s, compiled);
		return compiled;
	}

	/**
	 * Check if a text matches any known system pattern
	 */
	public static async matchSystemMessage(server: string, text: string): Promise<ISystemPattern | null> {
		if (!text) return null;
		const cleanText = text.trim();

		const patterns = await this.getPatternsForServer(server);
		for (const { regex, doc } of patterns) {
			if (regex.test(cleanText)) {
				return doc;
			}
		}

		// Check against hardcoded default patterns as immediate safety net
		for (const p of defaultSystemPatterns) {
			try {
				if (new RegExp(p.pattern, "i").test(cleanText)) {
					return p as unknown as ISystemPattern;
				}
			} catch {
				// Ignore
			}
		}

		return null;
	}

	/**
	 * Invalidate cached system patterns for a server
	 */
	public static async invalidateCache(server: string): Promise<void> {
		this.memoryCache.delete(server.toLowerCase());
		this.memoryCache.delete("global");

		const redis = RedisClient.getClient();
		if (redis && RedisClient.ready) {
			try {
				await redis.del(`anarchy:${server}:system_patterns`);
				await redis.del(`anarchy:global:system_patterns`);
			} catch {
				// Ignore
			}
		}
	}
}
