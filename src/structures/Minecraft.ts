import { Bot, createBot } from "mineflayer";
import { readdirSync } from "fs";
import { TextChannel } from "discord.js";
import { Discord } from ".";
import { LiveChatManager } from "./LiveChatManager";
import { PlaytimeTracker } from "../services/PlaytimeTracker";
import { MineflayerOptions, Server, ServerInfo, ServerIp } from "../typings/types";
import { MineflayerEvent } from "../typings/MineflayerEvent";
import { pathfinder } from "mineflayer-pathfinder";

export class Minecraft {
	public currentServer: Server = Server.Queue;
	public uptime: number = 0;
	public channel: TextChannel;
	public joined = false;
	public spawnCount = 0;
	public bot!: Bot; // Added non-null assertion operator
	public liveChatManager: LiveChatManager;
	public playtimeTracker: PlaytimeTracker;

	public readonly dev = false;
	public readonly config: MineflayerOptions = {
		username: process.env.BOT_NAME || process.env.EMAIL || "mo0nbot",
		// password: process.env.PASSWORD,
		authme: process.env.AUTHME,
		pin: process.env.PIN?.split(""),
		auth: (process.env.AUTH_MODE as "microsoft" | "offline") || "offline",
		profilesFolder: "./.ms_cache",
		serverInfo: { auth: "offline", ip: ServerIp.anarchyVN, version: "1.19.4", livechat: "000000000000000000" },
		reconnectInterval: 5 * 60 * 1000,
		livechat: {
			/**
			 * displayName: The display name of the discord user
			 * message: The message sent by the discord user
			 */
			chat: "> [{displayName}] {message} | bit.ly/mo0nbot",
			rateLimitFlags: {
				enabled: true,
				time: 2 * 60 * 1000, // Cooldown period when rate limited
				windowSize: 10 * 1000, // Sliding window size in ms
				messageThreshold: 10, // Max messages in window before limiting
				burstThreshold: 5, // Max messages in quick succession
				burstInterval: 2 * 1000, // Interval to check for bursts
				minimumEmbeds: 5, // Minimum embeds to send when rate limited
			},
			topic: {
				enabled: true,
				interval: 5 * 1000 + 10 * 60 * 1000,
			},
			autoMessage: {
				enabled: false,
				msgs: [
					// "Server lưu trữ tin nhắn hơn 25.000 players và hơn 11 triệu tin nhắn tại discord: bit.ly/mo0nbot2",
					// "Bot đời đầu tại 2y2c anarchy, ghé discord bit.ly/mo0nbot2 để ủng hộ <3",
					// "Cập nhật livechat các server anarchy tại: bit.ly/mo0nbot2",
					// "Tin nhắn được gửi mỗi 15 phút, hiện tại là {time}"
				],
				interval: 15 * 60 * 1000,
			},
		},
	};

	public client: Discord;

	constructor(client: Discord, serverInfo: ServerInfo) {
		this.client = client;
		this.config.dev = this.client.dev;
		this.config.serverInfo = serverInfo;
		this.config.livechat.channelId = serverInfo.livechat;

		if (this.config.serverInfo.auth === "offline") {
			this.config.username = process.env.BOT_NAME || "mo0nbot";
		} else if (this.config.serverInfo.auth === "microsoft") {
			this.config.username = process.env.EMAIL;
		}

		this.createBot();
		this.loadEvents();

		this.client.on("messageCreate", message => {
			if (message.author.bot || !message.content) return;

			if (message.channel?.id === this.config.livechat.channelId) {
				if (message.content.startsWith(">")) return;

				if (!this.joined || this.currentServer !== Server.Main) {
					message.react(this.client.config.emojis.no_chatting);
					return;
				}

				this.bot.chat(this.config.livechat.chat
					.replace(/\{displayName\}/g, message.author.displayName)
					.replace(/\{message\}/g, message.content));
				message.react(this.client.config.emojis.tick);
			}
		});
		this.channel = this.client.channels.cache.get(this.config.livechat.channelId) as TextChannel;
		this.liveChatManager = new LiveChatManager(this);
		this.playtimeTracker = new PlaytimeTracker(this);
	}

	private createBot() {
		const isMicrosoft = this.config.serverInfo.auth === "microsoft";
		const username = isMicrosoft
			? (this.config.username || process.env.EMAIL)
			: (this.config.username || process.env.BOT_NAME || "mo0nbot");

		if (!username) {
			this.client.logger.error("No username or email provided for Minecraft bot!");
			return;
		}

		const botOptions: any = {
			host: this.config.serverInfo.ip,
			port: 25565,
			username: username,
			version: this.config.serverInfo.version,
			auth: this.config.serverInfo.auth,
		};

		if (isMicrosoft) {
			botOptions.profilesFolder = this.config.profilesFolder || "./.ms_cache";
			if (this.config.password) {
				botOptions.password = this.config.password;
			}
		}

		this.bot = createBot(botOptions);
		this.bot.loadPlugin(pathfinder);
	}

	private loadEvents() {
		readdirSync("./dist/events/mineflayer").forEach(async eventFile => {
			if (!eventFile.endsWith(".js") && !eventFile.endsWith(".ts")) return;

			const EventClass = (await import(`../events/mineflayer/${eventFile}`)).default;
			const event: MineflayerEvent = new EventClass();

			/* eslint-disable */

			if (event.once)
				this.bot.once(event.name, (...args: any[]) => event.execute(this, ...args));
			else
				this.bot.on(event.name, (...args: any[]) => event.execute(this, ...args));

		});
	}
}