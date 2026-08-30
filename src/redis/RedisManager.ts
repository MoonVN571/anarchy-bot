import { RedisClient } from "./index";
import { IDeathPattern } from "../database/models/DeathPatternModel";

export class RedisManager {
	private static get prefix(): string {
		return process.env.REDIS_PREFIX || "anarchy";
	}

	private static key(server: string, category: string, subKey?: string): string {
		const s = server.toLowerCase().trim();
		return subKey ? `${this.prefix}:${s}:${category}:${subKey}` : `${this.prefix}:${s}:${category}`;
	}

	// 1. Online Players Management
	public static async addOnlinePlayer(server: string, username: string): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "online_players");
			await client.sadd(k, username.toLowerCase());
		} catch {
			// Ignore cache failure
		}
	}

	public static async removeOnlinePlayer(server: string, username: string): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "online_players");
			await client.srem(k, username.toLowerCase());
		} catch {
			// Ignore cache failure
		}
	}

	public static async getOnlinePlayers(server: string): Promise<string[]> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return [];

		try {
			const k = this.key(server, "online_players");
			return await client.smembers(k);
		} catch {
			return [];
		}
	}

	public static async setOnlinePlayers(server: string, usernames: string[]): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "online_players");
			await client.del(k);
			if (usernames.length > 0) {
				await client.sadd(k, ...usernames.map(u => u.toLowerCase()));
			}
		} catch {
			// Ignore cache failure
		}
	}

	// 2. Session Tracking
	public static async startSession(server: string, username: string, startTime: number = Date.now()): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "session", username.toLowerCase());
			await client.hset(k, {
				startTime: String(startTime),
				lastPing: String(startTime),
			});
			await client.expire(k, 86400); // 24h safety expiry
		} catch {
			// Ignore cache failure
		}
	}

	public static async updateSessionPing(server: string, username: string, pingTime: number = Date.now()): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "session", username.toLowerCase());
			await client.hset(k, "lastPing", String(pingTime));
		} catch {
			// Ignore cache failure
		}
	}

	public static async endSession(server: string, username: string): Promise<{ durationSeconds: number } | null> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return null;

		try {
			const k = this.key(server, "session", username.toLowerCase());
			const session = await client.hgetall(k);
			await client.del(k);

			if (session && session.startTime) {
				const start = parseInt(session.startTime, 10);
				const now = Date.now();
				const durationSeconds = Math.max(1, Math.floor((now - start) / 1000));
				return { durationSeconds };
			}
			return null;
		} catch {
			return null;
		}
	}

	// 3. Death Patterns Caching
	public static async cacheDeathPatterns(server: string, patterns: IDeathPattern[]): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const k = this.key(server, "death_patterns");
			const serialized = JSON.stringify(
				patterns.map(p => ({
					_id: String(p._id),
					serverScope: p.serverScope,
					name: p.name,
					pattern: p.pattern,
					cause: p.cause,
					priority: p.priority,
					enabled: p.enabled,
				}))
			);
			await client.set(k, serialized, "EX", 3600); // 1 hour TTL
		} catch {
			// Ignore cache failure
		}
	}

	public static async getCachedDeathPatterns(server: string): Promise<any[] | null> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return null;

		try {
			const k = this.key(server, "death_patterns");
			const data = await client.get(k);
			return data ? JSON.parse(data) : null;
		} catch {
			return null;
		}
	}

	public static async invalidateDeathPatterns(server: string): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			await client.del(this.key(server, "death_patterns"));
			await client.del(this.key("global", "death_patterns"));
		} catch {
			// Ignore cache failure
		}
	}

	// 4. Leaderboards (ZSET)
	public static async incrementLeaderboard(
		server: string,
		board: "playtime" | "kills" | "deaths" | "messages",
		username: string,
		amount: number = 1
	): Promise<void> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return;

		try {
			const serverKey = this.key(server, `leaderboard:${board}`);
			const globalKey = `${this.prefix}:global:leaderboard:${board}`;

			await client.zincrby(serverKey, amount, username.toLowerCase());
			await client.zincrby(globalKey, amount, username.toLowerCase());
		} catch {
			// Ignore cache failure
		}
	}

	public static async getTopLeaderboard(
		server: string,
		board: "playtime" | "kills" | "deaths" | "messages",
		limit: number = 10
	): Promise<{ username: string; score: number }[]> {
		const client = RedisClient.getClient();
		if (!client || !RedisClient.ready) return [];

		try {
			const key = server === "global" ? `${this.prefix}:global:leaderboard:${board}` : this.key(server, `leaderboard:${board}`);
			const raw = await client.zrevrange(key, 0, limit - 1, "WITHSCORES");
			const result: { username: string; score: number }[] = [];

			for (let i = 0; i < raw.length; i += 2) {
				result.push({
					username: raw[i],
					score: parseFloat(raw[i + 1]),
				});
			}

			return result;
		} catch {
			return [];
		}
	}
}
