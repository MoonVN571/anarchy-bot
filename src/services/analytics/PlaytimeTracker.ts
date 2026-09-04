import { Minecraft } from "../../structures/Minecraft";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { StalkService } from "../minecraft/StalkService";
import { ChatPriority } from "../minecraft/ChatQueueService";

export class PlaytimeTracker {
	private main: Minecraft;
	private syncInterval: NodeJS.Timeout | null = null;
	private recentJoins: Map<string, number> = new Map(); // Debounce duplicate join events
	private readonly JOIN_DEBOUNCE_MS = 3000;
	private static readonly HEALTH_MESSAGES_2H = [
		"Ông bạn ơi, cày 2 tiếng rồi đấy! Đứng dậy đi lại tí, uống miếng nước rồi quay lại chiến tiếp. (Dùng !grass off để tắt)",
		"2 tiếng rồi đó đứng dậy đi xíu cho giãn cơ đi ba (Dùng !grass off để tắt)",
		"2 tiếng rồi đấy ông! Uống nước, chớp mắt, nhìn xa một tí. Minecraft nó vẫn còn đó thôi ông ơi. (Dùng !grass off để tắt)",
		"Ngồi Minecraft 2 tiếng không đứng dậy là hơi căng rồi đó! Đứng lên đi lại vài vòng cho người nó hoạt động tí nào. (Dùng !grass off để tắt)",
	];

	private static readonly HEALTH_MESSAGES_4H = [
		"4 tiếng rồi ông ơi! Cơm nước ngủ nghỉ đi xong vào cày tiếp ông ơi. (Dùng !grass off để tắt)",
		"4 tiếng rồi đấy ông ơi! Nghỉ 5 phút uống miếng nước đi. (Dùng !grass off để tắt)",
		"4 tiếng online liên tục! Đừng để nó thành nếp ông ơi. (Dùng !grass off để tắt)",
		"4 tiếng rồi đấy! Nghỉ tay nghỉ mắt, đi ăn cơm đi ông ơi. (Dùng !grass off để tắt)",
		"4 tiếng cày Minecraft không nghỉ rồi hảaaaa (Dùng !grass off để tắt)",
	];

	private static readonly HEALTH_MESSAGES_6H = [
		"6 tiếng online liên tục, đỉnh vậy mày ơi? (Dùng !grass off để tắt)",
		"6 tiếng cày Minecraft không nghỉ rồi hảaaaa (Dùng !grass off để tắt)",
		"m điên rồi đó, 6 tiếng chơi liên tục r đó (Dùng !grass off để tắt)"
	];

	constructor(main: Minecraft) {
		this.main = main;
	}

	private get serverIp(): string {
		return this.main.config.connection.host;
	}

	public start(): void {
		if (this.syncInterval) clearInterval(this.syncInterval);

		// Immediately sync online players on start
		this.syncOnlinePlayers().catch(() => { });

		// Sync online players periodically every 60 seconds
		this.syncInterval = setInterval(() => {
			this.syncOnlinePlayers().catch(() => { });
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

		// Debounce rapid duplicate join calls
		const now = Date.now();
		const lastJoinTime = this.recentJoins.get(lowerUser) || 0;
		if (now - lastJoinTime < this.JOIN_DEBOUNCE_MS) {
			return;
		}
		this.recentJoins.set(lowerUser, now);

		await RedisManager.addOnlinePlayer(this.serverIp, lowerUser);
		await RedisManager.startSession(this.serverIp, lowerUser);
		this.main.client.logger.debug("Playtime", `[${this.serverIp}] Player "${cleanUser}" joined. Started session.`);

		// Stalk alert trigger
		StalkService.onPlayerJoin(this.serverIp, lowerUser, cleanUser, this.main).catch(() => { });

		const nowDate = new Date(now);
		try {
			await PlayerModel.findOneAndUpdate(
				{ server: this.serverIp, username: lowerUser },
				{
					$setOnInsert: {
						server: this.serverIp,
						username: lowerUser,
						displayName: cleanUser,
						firstSeen: nowDate,
						playtime: 0,
						kills: 0,
						deaths: 0,
						messageCount: 0,
						leaveCount: 0,
						healthWarning: true,
					},
					$set: {
						lastSeen: nowDate,
						lastJoin: nowDate,
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

		// Stalk alert trigger
		StalkService.onPlayerLeave(this.serverIp, lowerUser, cleanUser, this.main).catch(() => { });

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

		const now = new Date();
		const nowMs = now.getTime();

		for (const username of currentPlayers) {
			const lower = username.toLowerCase();
			await RedisManager.updateSessionPing(this.serverIp, lower);
			await RedisManager.incrementLeaderboard(this.serverIp, "playtime", lower, 60);

			// Check continuous session health warning
			this.checkSessionHealthWarning(lower, username, nowMs).catch(() => { });

			PlayerModel.updateOne(
				{ server: this.serverIp, username: lower },
				{
					$setOnInsert: {
						server: this.serverIp,
						username: lower,
						displayName: username,
						firstSeen: now,
						playtime: 0,
						kills: 0,
						deaths: 0,
						messageCount: 0,
						joinCount: 1,
						leaveCount: 0,
						healthWarning: true,
					},
					$set: { lastSeen: now, isOnline: true },
					$inc: { playtime: 60 },
				},
				{ upsert: true }
			).catch(() => { });
		}
	}

	/**
	 * Check if player reached 2h/4h/6h online and send touch grass reminder
	 */
	private async checkSessionHealthWarning(lowerUser: string, displayName: string, nowMs: number): Promise<void> {
		if (!this.main.joined) return;

		const session = await RedisManager.getSession(this.serverIp, lowerUser);
		if (!session || !session.startTime) return;

		const sessionHours = (nowMs - session.startTime) / (3600 * 1000);
		const lastWarned = session.lastWarnedHour || 0;

		let milestone = 0;
		let messages: string[] = [];

		if (sessionHours >= 6 && lastWarned < 6) {
			milestone = 6;
			messages = PlaytimeTracker.HEALTH_MESSAGES_6H;
		} else if (sessionHours >= 4 && lastWarned < 4) {
			milestone = 4;
			messages = PlaytimeTracker.HEALTH_MESSAGES_4H;
		} else if (sessionHours >= 2 && lastWarned < 2) {
			milestone = 2;
			messages = PlaytimeTracker.HEALTH_MESSAGES_2H;
		}

		if (milestone > 0 && messages.length > 0) {
			// Check if player has healthWarning enabled
			const playerDoc = await PlayerModel.findOne({ server: this.serverIp, username: lowerUser });
			if (playerDoc && playerDoc.healthWarning === false) {
				// Player opted out via !grass off
				await RedisManager.setSessionWarnedHour(this.serverIp, lowerUser, milestone);
				return;
			}

			const chosenMsg = messages[Math.floor(Math.random() * messages.length)];
			this.main.chatQueue.send(`/w ${displayName} ${chosenMsg}`, ChatPriority.LOW);
			await RedisManager.setSessionWarnedHour(this.serverIp, lowerUser, milestone);
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
