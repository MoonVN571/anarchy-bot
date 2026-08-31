import { PlayerModel, IPlayer } from "../../database/models/PlayerModel";
import { MessageModel } from "../../database/models/MessageModel";
import { DeathModel } from "../../database/models/DeathModel";
import { RedisManager } from "../../redis/RedisManager";

export class StatsService {
	/**
	 * Get profile statistics for a player on a specific server or globally
	 */
	public static async getPlayerStats(server: string, username: string): Promise<IPlayer | null> {
		const lowerUser = username.toLowerCase().trim();

		try {
			if (server === "global") {
				// Aggregate player stats across all servers
				const records = await PlayerModel.find({ username: lowerUser });
				if (!records || records.length === 0) return null;

				const firstSeenDate = new Date(Math.min(...records.map(r => r.firstSeen.getTime())));
				const lastSeenDate = new Date(Math.max(...records.map(r => r.lastSeen.getTime())));

				const combined: any = {
					server: "global",
					username: lowerUser,
					displayName: records[0].displayName || username,
					firstSeen: firstSeenDate,
					joinDate: firstSeenDate,
					lastSeen: lastSeenDate,
					lastJoin: new Date(Math.max(...records.map(r => (r.lastJoin ? r.lastJoin.getTime() : r.firstSeen.getTime())))),
					lastQuit: records.some(r => r.lastQuit) ? new Date(Math.max(...records.filter(r => r.lastQuit).map(r => r.lastQuit!.getTime()))) : undefined,
					joinCount: records.reduce((acc, r) => acc + (r.joinCount || 1), 0),
					leaveCount: records.reduce((acc, r) => acc + (r.leaveCount || 0), 0),
					playtime: records.reduce((acc, r) => acc + (r.playtime || 0), 0),
					isOnline: records.some(r => r.isOnline),
					messageCount: records.reduce((acc, r) => acc + (r.messageCount || 0), 0),
					kills: records.reduce((acc, r) => acc + (r.kills || 0), 0),
					deaths: records.reduce((acc, r) => acc + (r.deaths || 0), 0),
					suicides: records.reduce((acc, r) => acc + (r.suicides || 0), 0),
					mobDeaths: records.reduce((acc, r) => acc + (r.mobDeaths || 0), 0),
					highestKillstreak: Math.max(...records.map(r => r.highestKillstreak || 0)),
					currentKillstreak: records.find(r => r.isOnline)?.currentKillstreak || 0,
				};
				combined.kdRatio = combined.deaths > 0 ? parseFloat((combined.kills / combined.deaths).toFixed(2)) : combined.kills;
				return combined as IPlayer;
			}

			const player = await PlayerModel.findOne({ server, username: lowerUser });
			if (player) {
				if (!player.joinCount || player.joinCount < 1) {
					player.joinCount = 1;
				}
			}
			return player;
		} catch {
			return null;
		}
	}

	/**
	 * Get top players leaderboard for a specific category
	 */
	public static async getLeaderboard(
		server: string,
		board: "playtime" | "kills" | "deaths" | "messages" | "kd",
		limit: number = 10
	): Promise<{ username: string; score: number; kills?: number; deaths?: number }[]> {
		// 1. Try Redis cache ZSET
		const cached = await RedisManager.getTopLeaderboard(server, board, limit);
		if (cached && cached.length > 0) {
			return cached;
		}

		// 2. Fallback to MongoDB
		try {
			const sortField = board === "messages" ? "messageCount" : (board === "kd" ? "kdRatio" : board);
			const filter: any = {};
			if (server !== "global") {
				filter.server = server;
			}

			const sortQuery: any = board === "kd" ? { kdRatio: -1, kills: -1 } : { [sortField]: -1 };

			const topPlayers = await PlayerModel.find(filter)
				.sort(sortQuery)
				.limit(limit)
				.select(`username displayName kills deaths ${sortField}`)
				.lean();

			return topPlayers.map((p: any) => ({
				username: p.displayName || p.username,
				score: p[sortField] || 0,
				kills: p.kills || 0,
				deaths: p.deaths || 0,
			}));
		} catch {
			return [];
		}
	}

	/**
	 * Get server summary overview
	 */
	public static async getServerSummary(server: string): Promise<{
		totalPlayers: number;
		onlinePlayers: number;
		totalMessages: number;
		totalDeaths: number;
	}> {
		try {
			const serverFilter = server === "global" ? {} : { server };
			const online = await RedisManager.getOnlinePlayers(server);

			const [totalPlayers, totalMessages, totalDeaths] = await Promise.all([
				PlayerModel.countDocuments(serverFilter),
				MessageModel.countDocuments(serverFilter),
				DeathModel.countDocuments(serverFilter),
			]);

			return {
				totalPlayers,
				onlinePlayers: online.length,
				totalMessages,
				totalDeaths,
			};
		} catch {
			return {
				totalPlayers: 0,
				onlinePlayers: 0,
				totalMessages: 0,
				totalDeaths: 0,
			};
		}
	}
}
