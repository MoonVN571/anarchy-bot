import { Minecraft } from "../structures/Minecraft";
import { PlayerModel } from "../database/models/PlayerModel";
import { RedisManager } from "../redis/RedisManager";

export class PlaytimeTracker {
	private main: Minecraft;
	private syncInterval: NodeJS.Timeout | null = null;

	constructor(main: Minecraft) {
		this.main = main;
	}

	private get serverIp(): string {
		return this.main.config.connection.host;
	}

	public start(): void {
		if (this.syncInterval) clearInterval(this.syncInterval);

		// Sync online players periodically every 60 seconds
		this.syncInterval = setInterval(() => {
			this.syncOnlinePlayers();
		}, 60 * 1000);
	}

	public stop(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
		this.flushAllOnlinePlayers();
	}

	/**
	 * Called when a player joins the server
	 */
	public async handlePlayerJoin(username: string, uuid?: string): Promise<void> {
		if (!username) return;
		const cleanUser = username.trim();
		const lowerUser = cleanUser.toLowerCase();

		await RedisManager.addOnlinePlayer(this.serverIp, lowerUser);
		await RedisManager.startSession(this.serverIp, lowerUser);
		this.main.client.logger.debug("Playtime", `[${this.serverIp}] Player "${cleanUser}" joined. Started session.`);

		const now = new Date();
		try {
			await PlayerModel.findOneAndUpdate(
				{ server: this.serverIp, username: lowerUser },
				{
					$setOnInsert: {
						server: this.serverIp,
						username: lowerUser,
						displayName: cleanUser,
						firstSeen: now,
						playtime: 0,
						kills: 0,
						deaths: 0,
						messageCount: 0,
					},
					$set: {
						lastSeen: now,
						lastJoin: now,
						isOnline: true,
						...(uuid ? { uuid } : {}),
					},
					$inc: {
						joinCount: 1,
					},
				},
				{ upsert: true, returnDocument: "after" }
			);
		} catch (err) {
			this.main.client.logger.error(`Error recording player join for ${cleanUser}: ${err}`);
		}
	}

	/**
	 * Called when a player leaves the server
	 */
	public async handlePlayerLeave(username: string): Promise<void> {
		if (!username) return;
		const cleanUser = username.trim();
		const lowerUser = cleanUser.toLowerCase();

		await RedisManager.removeOnlinePlayer(this.serverIp, lowerUser);
		const session = await RedisManager.endSession(this.serverIp, lowerUser);
		const deltaSeconds = session?.durationSeconds || 0;
		this.main.client.logger.debug("Playtime", `[${this.serverIp}] Player "${cleanUser}" left. Session duration: ${deltaSeconds}s.`);

		const now = new Date();
		try {
			if (deltaSeconds > 0) {
				await RedisManager.incrementLeaderboard(this.serverIp, "playtime", lowerUser, deltaSeconds);
			}

			await PlayerModel.findOneAndUpdate(
				{ server: this.serverIp, username: lowerUser },
				{
					$set: {
						lastSeen: now,
						lastQuit: now,
						isOnline: false,
					},
					$inc: {
						playtime: deltaSeconds,
						leaveCount: 1,
					},
				},
				{ returnDocument: "after" }
			);
		} catch (err) {
			this.main.client.logger.error(`Error recording player leave for ${cleanUser}: ${err}`);
		}
	}

	/**
	 * Sync online players from Mineflayer bot's tablist / players cache
	 */
	public async syncOnlinePlayers(): Promise<void> {
		if (!this.main.bot?.players) return;

		const currentPlayers = Object.values(this.main.bot.players)
			.filter(p => p && p.username)
			.map(p => p.username);

		await RedisManager.setOnlinePlayers(this.serverIp, currentPlayers);
		this.main.client.logger.debug("Playtime", `[${this.serverIp}] Synced ${currentPlayers.length} online players (+60s playtime each).`);

		// Increment 60 seconds delta for all currently online players
		const now = new Date();
		for (const username of currentPlayers) {
			const lower = username.toLowerCase();
			await RedisManager.updateSessionPing(this.serverIp, lower);
			await RedisManager.incrementLeaderboard(this.serverIp, "playtime", lower, 60);

			PlayerModel.updateOne(
				{ server: this.serverIp, username: lower },
				{
					$set: { lastSeen: now, isOnline: true },
					$inc: { playtime: 60 },
				}
			).catch(() => {});
		}
	}

	/**
	 * Flush all online players on bot disconnect/shutdown
	 */
	private async flushAllOnlinePlayers(): Promise<void> {
		this.main.client.logger.debug("Playtime", `[${this.serverIp}] Flushing online status for all players.`);
		try {
			await PlayerModel.updateMany(
				{ server: this.serverIp, isOnline: true },
				{ $set: { isOnline: false, lastSeen: new Date() } }
			);
		} catch {
			// Ignore on shutdown
		}
	}
}
