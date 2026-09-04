import { Minecraft } from "../../structures";
import { Server } from "../../typings";
import { ChatPriority } from "./ChatQueueService";
import { ChatMinigameService } from "./ChatMinigameService";

export class AutoMessageService {
	private bot: Minecraft;
	private messageCount = 0;
	private targetThreshold = 35;
	private lastSentTimestamp = 0;
	private lastSentIndex = -1;
	private legacyIntervalTimer: NodeJS.Timeout | null = null;
	private minigameCounter = 0;

	constructor(bot: Minecraft) {
		this.bot = bot;
		this.generateNewTarget();
	}

	/**
	 * Called whenever a valid server message/event is received on the Minecraft server
	 */
	public onServerMessage(): void {
		const autoMessage = this.bot.config.livechat.autoMessage;
		if (!autoMessage || !autoMessage.enabled || !autoMessage.messages || autoMessage.messages.length === 0) {
			return;
		}

		// Message count trigger is only active when minMessages / maxMessages are set (> 0)
		const minMsg = autoMessage.minMessages ?? 25;
		const maxMsg = autoMessage.maxMessages ?? 50;

		if (minMsg <= 0 && maxMsg <= 0) {
			return;
		}

		this.messageCount++;

		if (this.messageCount >= this.targetThreshold) {
			this.trySendAutoMessage();
		}
	}

	/**
	 * Alias for onServerMessage
	 */
	public onPlayerChat(): void {
		this.onServerMessage();
	}

	/**
	 * Attempts to send an auto message if cooldown and server state allow
	 */
	public trySendAutoMessage(): void {
		if (this.bot.currentServer !== Server.Main || !this.bot.bot || !this.bot.joined) {
			return;
		}

		const autoMessage = this.bot.config.livechat.autoMessage;
		if (!autoMessage || !autoMessage.enabled || !autoMessage.messages || autoMessage.messages.length === 0) {
			return;
		}

		const minIntervalMs = autoMessage.minIntervalMs ?? 60 * 1000;
		const now = Date.now();

		// Cooldown safety check
		if (now - this.lastSentTimestamp < minIntervalMs) {
			// Keep messageCount at threshold so next message after cooldown fires immediately
			this.messageCount = this.targetThreshold;
			return;
		}

		this.minigameCounter++;
		// Every 3rd auto message cycle, attempt to launch a broadcast minigame if none is running
		if (this.minigameCounter % 3 === 0 && !ChatMinigameService.hasActiveMinigame(this.bot.config.connection.host)) {
			ChatMinigameService.startRandomMinigame(this.bot);
			this.lastSentTimestamp = now;
			this.messageCount = 0;
			this.generateNewTarget();
			return;
		}

		const chosenIndex = this.selectNextMessageIndex(autoMessage.messages, autoMessage.mode || "random");
		if (chosenIndex < 0 || chosenIndex >= autoMessage.messages.length) {
			return;
		}

		const rawMessage = autoMessage.messages[chosenIndex];
		const formattedMessage = this.formatMessage(rawMessage);

		this.bot.chatQueue.send(formattedMessage, ChatPriority.LOW);
		this.bot.client.logger.info(
			`[AutoMessage] [${this.bot.config.connection.host}] Enqueued tip (${this.messageCount} msgs triggered, next in ${this.targetThreshold}): ${formattedMessage}`
		);

		this.lastSentTimestamp = now;
		this.lastSentIndex = chosenIndex;
		this.messageCount = 0;
		this.generateNewTarget();
	}

	/**
	 * Start legacy time-based timer if configured with interval and no message-count trigger
	 */
	public startLegacyTimer(): void {
		this.stopLegacyTimer();

		const autoMessage = this.bot.config.livechat.autoMessage;
		if (!autoMessage || !autoMessage.enabled || !autoMessage.interval || autoMessage.interval <= 0) {
			return;
		}

		// If minMessages is defined and > 0, we prioritize message-count trigger instead of interval timer
		if (autoMessage.minMessages && autoMessage.minMessages > 0) {
			return;
		}

		this.legacyIntervalTimer = setInterval(() => {
			this.trySendAutoMessage();
		}, autoMessage.interval);
	}

	/**
	 * Stop legacy timer
	 */
	public stopLegacyTimer(): void {
		if (this.legacyIntervalTimer) {
			clearInterval(this.legacyIntervalTimer);
			this.legacyIntervalTimer = null;
		}
	}

	/**
	 * Reset counters when server reconnects or bot joins
	 */
	public reset(): void {
		this.messageCount = 0;
		this.minigameCounter = 0;
		this.generateNewTarget();
		this.startLegacyTimer();
	}

	private generateNewTarget(): void {
		const autoMessage = this.bot.config?.livechat?.autoMessage;
		const minMsg = autoMessage?.minMessages ?? 25;
		const maxMsg = autoMessage?.maxMessages ?? 50;

		const min = Math.max(1, Math.min(minMsg, maxMsg));
		const max = Math.max(1, Math.max(minMsg, maxMsg));

		this.targetThreshold = Math.floor(Math.random() * (max - min + 1)) + min;
	}

	private selectNextMessageIndex(messages: string[], mode: "random" | "sequential"): number {
		if (messages.length === 0) return -1;
		if (messages.length === 1) return 0;

		if (mode === "sequential") {
			return (this.lastSentIndex + 1) % messages.length;
		}

		// Random mode with anti-repeat (avoid consecutive identical messages)
		let nextIndex = Math.floor(Math.random() * messages.length);
		if (nextIndex === this.lastSentIndex && messages.length > 1) {
			nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (messages.length - 1))) % messages.length;
		}

		return nextIndex;
	}

	public formatMessage(template: string): string {
		// 1. Vietnam Real Time (UTC+7)
		const now = new Date();
		const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
		const vnHours = vnDate.getUTCHours().toString().padStart(2, "0");
		const vnMinutes = vnDate.getUTCMinutes().toString().padStart(2, "0");
		const vnSeconds = vnDate.getUTCSeconds().toString().padStart(2, "0");
		const realTimeVN = `${vnHours}:${vnMinutes}:${vnSeconds}`;

		const dayStr = vnDate.getUTCDate().toString().padStart(2, "0");
		const monthStr = (vnDate.getUTCMonth() + 1).toString().padStart(2, "0");
		const yearStr = vnDate.getUTCFullYear();
		const realDateVN = `${dayStr}/${monthStr}/${yearStr}`;
		const realDateTimeVN = `${realTimeVN} ${realDateVN}`;

		// 2. Minecraft In-game Time & Environment
		const timeOfDay = this.bot.bot?.time?.timeOfDay ?? 0;
		const totalMinutes = Math.floor(((timeOfDay + 6000) % 24000) / (24000 / (24 * 60)));
		const ingameH = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
		const ingameM = (totalMinutes % 60).toString().padStart(2, "0");
		const ingameTime = `${ingameH}:${ingameM}`;

		const isNight = timeOfDay >= 13000 && timeOfDay <= 23000;
		const dayNight = isNight ? "Ban đêm" : "Ban ngày";

		const worldAge = this.bot.bot?.time?.age ?? 0;
		const worldDay = Math.floor(worldAge / 24000);

		const MOON_PHASES = [
			"Trăng tròn",
			"Trăng khuyết giảm",
			"Bán nguyệt cuối",
			"Trăng tàn",
			"Trăng non",
			"Trăng non đầu tháng",
			"Bán nguyệt đầu",
			"Trăng khuyết tăng",
		];
		const moonPhase = MOON_PHASES[worldDay % 8] || "Trăng tròn";

		let weather = "Trời quang";
		if (this.bot.bot?.thunderState && this.bot.bot.thunderState > 0) {
			weather = "Bão sấm sét";
		} else if (this.bot.bot?.isRaining) {
			weather = "Trời mưa";
		}

		const playersOnline = Object.keys(this.bot.bot?.players || {}).length;

		return template
			.replace(/\{real_time_vn\}|\{real_time\}|\{time\}/g, realTimeVN)
			.replace(/\{real_date_vn\}|\{real_date\}/g, realDateVN)
			.replace(/\{real_datetime_vn\}/g, realDateTimeVN)
			.replace(/\{ingame_time\}/g, ingameTime)
			.replace(/\{day_night\}/g, dayNight)
			.replace(/\{moon_phase\}/g, moonPhase)
			.replace(/\{world_day\}|\{world_age\}/g, `Ngày ${worldDay}`)
			.replace(/\{weather\}/g, weather)
			.replace(/\{players_online\}|\{player_count\}/g, String(playersOnline))
			.replace(/\{server\}/g, this.bot.config.name || this.bot.config.connection.host)
			.replace(/\{bot\}/g, this.bot.bot?.username || "mo0nbot");
	}
}
