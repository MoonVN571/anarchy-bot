import { TextChannel } from "discord.js";
import { Bot, BotOptions, createBot } from "mineflayer";
import { pathfinder } from "mineflayer-pathfinder";
import { mineflayerEventClasses } from "../events/mineflayer";
import { AntiAfkService, AutoEatService, AutoMessageService, HighwayNavigationService, PlaytimeTracker, SmartPathfinderService, viewerManager } from "../services";
import { MinecraftServerConfig, Server } from "../typings";
import { Discord } from "./Discord";
import { LiveChatManager } from "./LiveChatManager";

export class Minecraft {
	public client: Discord;
	public config: MinecraftServerConfig;

	public currentServer: Server = Server.Queue;
	public uptime: number = 0;
	public channel!: TextChannel;
	public joined: boolean = false;
	public spawnCount: number = 0;
	public bot!: Bot;
	public liveChatManager: LiveChatManager;
	public playtimeTracker: PlaytimeTracker;
	public autoMessageService: AutoMessageService;
	public antiAfkService: AntiAfkService;
	public smartPathfinderService: SmartPathfinderService;
	public highwayNavigationService: HighwayNavigationService;
	public autoEatService: AutoEatService;

	private isDestroyed: boolean = false;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private queueTimeoutTimer: NodeJS.Timeout | null = null;
	private topicIntervalTimer: NodeJS.Timeout | null = null;

	constructor(client: Discord, config: MinecraftServerConfig) {
		this.client = client;
		this.config = config;

		this.liveChatManager = new LiveChatManager(this);
		this.playtimeTracker = new PlaytimeTracker(this);
		this.autoMessageService = new AutoMessageService(this);
		this.antiAfkService = new AntiAfkService(this);
		this.smartPathfinderService = new SmartPathfinderService(this);
		this.highwayNavigationService = new HighwayNavigationService(this);
		this.autoEatService = new AutoEatService(this);

		this.resolveChannel();
		this.connect();
	}

	public resolveChannel(): void {
		if (this.config.livechat.channelId) {
			const channel = this.client.channels.cache.get(this.config.livechat.channelId);
			if (channel && channel.isTextBased()) {
				this.channel = channel as TextChannel;
			}
		}
	}

	public connect(): void {
		if (this.isDestroyed) return;

		this.cleanupBotInstance();
		this.clearAllTimers();
		this.joined = false;
		this.spawnCount = 0;
		this.currentServer = Server.Queue;

		const isMicrosoft = this.config.connection.auth === "microsoft";
		const username = isMicrosoft
			? this.config.connection.microsoftEmail
			: (this.config.connection.username || "mo0nbot");

		if (!username) {
			this.client.logger.error(`No username or email provided for Minecraft bot on ${this.config.connection.host}!`);
			return;
		}

		const botOptions: BotOptions = {
			host: this.config.connection.host,
			port: this.config.connection.port || 25565,
			username: username,
			version: this.config.connection.version || "1.19.4",
			auth: this.config.connection.auth,
		};

		if (isMicrosoft) {
			botOptions.profilesFolder = this.config.connection.profilesFolder || "./.ms_cache";
			if (this.config.connection.microsoftPassword) {
				botOptions.password = this.config.connection.microsoftPassword;
			}
		}

		try {
			this.bot = createBot(botOptions);
			this.bot.loadPlugin(pathfinder);
			this.loadEvents();
		} catch (error) {
			this.client.logger.error(`Error creating Minecraft bot instance: ${error}`);
			this.reconnect();
		}
	}

	public reconnect(delayMs?: number): void {
		if (this.isDestroyed) return;
		if (this.reconnectTimer) return; // Reconnection already scheduled

		this.clearAllTimers();
		this.playtimeTracker?.stop();

		const waitTime = delayMs ?? this.config.reconnectInterval;
		this.client.logger.info(`Reconnecting bot for ${this.config.connection.host} in ${waitTime / 1000}s...`);

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.cleanupBotInstance();
			this.connect();
		}, waitTime);
	}

	public sendChatMessage(displayName: string, message: string): void {
		if (!this.joined || this.currentServer !== Server.Main || !this.bot) {
			return;
		}

		const formatted = this.config.livechat.chatTemplate
			.replace(/\{displayName\}/g, displayName)
			.replace(/\{message\}/g, message);

		this.bot.chat(formatted);
	}

	public startQueueTimeout(): void {
		if (this.queueTimeoutTimer || this.currentServer === Server.Main) return;

		this.queueTimeoutTimer = setTimeout(() => {
			if (this.currentServer === Server.Queue && this.bot) {
				this.client.logger.warn(`Queue timeout reached for ${this.config.connection.host}. Quitting bot.`);
				this.bot.quit();
			}
		}, 5 * 60 * 1000);
	}

	public clearQueueTimeout(): void {
		if (this.queueTimeoutTimer) {
			clearTimeout(this.queueTimeoutTimer);
			this.queueTimeoutTimer = null;
		}
	}

	public startTopicTimer(): void {
		this.stopTopicTimer();
		const { topic } = this.config.livechat;
		if (!topic.enabled) return;

		this.topicIntervalTimer = setInterval(() => {
			if (this.currentServer !== Server.Main || !this.bot || !this.channel) return;

			const clean = (str: string) => str.replace(/\u00A7[0-9A-FK-OR]|-/gi, "");
			const tlHeader = this.bot.tablist?.header;
			const tlFooter = this.bot.tablist?.footer;
			const header = tlHeader?.json?.text ? clean(tlHeader.json.text) : "";
			const footer = tlFooter?.json?.text ? clean(tlFooter.json.text + (tlFooter.extra?.join("") || "")) : "";
			let str = "";

			if (this.config.connection.host === "2y2c.org" && footer) {
				str += footer.split("\n").slice(1, 2).join("\n");
			}
			str += `\nConnected <t:${Math.floor(this.uptime / 1000)}:R>, updated <t:${Math.floor(Date.now() / 1000)}:R>` +
				"\n\n" + header + footer;

			this.channel.setTopic(str).catch(() => { });
		}, topic.interval);
	}

	public stopTopicTimer(): void {
		if (this.topicIntervalTimer) {
			clearInterval(this.topicIntervalTimer);
			this.topicIntervalTimer = null;
		}
	}

	public startAutoMessageTimer(): void {
		this.autoMessageService.reset();
	}

	public stopAutoMessageTimer(): void {
		this.autoMessageService.stopLegacyTimer();
	}

	public startViewer(): void {
		if (process.env.VIEWER_ENABLED === "false" || !this.bot) return;
		viewerManager.registerBot(this);
	}

	public stopViewer(): void {
		viewerManager.unregisterBot(this.config.id);
	}

	public disconnect(): void {
		this.clearAllTimers();
		this.smartPathfinderService?.stop();
		this.highwayNavigationService?.stop();
		this.autoEatService?.stop();
		this.antiAfkService?.stop();
		this.stopViewer();
		this.playtimeTracker?.stop();
		this.liveChatManager?.clear();
		this.cleanupBotInstance();
	}

	public destroy(): void {
		this.isDestroyed = true;
		this.disconnect();
	}

	private cleanupBotInstance(): void {
		this.smartPathfinderService?.stop();
		this.highwayNavigationService?.stop();
		this.autoEatService?.stop();
		this.antiAfkService?.stop();
		if (this.bot) {
			this.stopViewer();
			try {
				this.bot.removeAllListeners();
				this.bot.quit();
			} catch { }
			(this as any).bot = null;
		}
	}

	private clearAllTimers(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.clearQueueTimeout();
		this.stopTopicTimer();
		this.stopAutoMessageTimer();
	}

	private loadEvents(): void {
		try {
			for (const EventClass of mineflayerEventClasses) {
				const event = new EventClass();
				if (event.once) {
					this.bot.once(event.name, (...args: unknown[]) => event.execute(this, ...args));
				} else {
					this.bot.on(event.name, (...args: unknown[]) => event.execute(this, ...args));
				}
			}
		} catch (err) {
			this.client.logger.error(`Failed to bind mineflayer events: ${err}`);
		}
	}
}