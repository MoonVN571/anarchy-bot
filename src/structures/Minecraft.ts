import { Bot, createBot } from "mineflayer";
import { readdirSync } from "fs";
import { pathfinder } from "mineflayer-pathfinder";
import { TextChannel } from "discord.js";
import { Discord } from ".";
import { MineflayerOptions, Server, ServerInfo, ServerIp } from "../typings/types";
import { MineflayerEvent } from "../typings/MineflayerEvent";

export class Minecraft {
	public currentServer: Server = Server.Queue;
	public uptime: number = 0;
	public channel: TextChannel;
	public joined = false;
	public spawnCount = 0;

	public readonly dev = false;
	public readonly config: MineflayerOptions = {
		username: process.env.EMAIL,
		password: process.env.PASSWORD,
		authme: process.env.AUTHME,
		pin: process.env.PIN?.split(""),
		auth: "microsoft",
		serverInfo: { auth: "offline", ip: ServerIp.anarchyVN, version: "1.12.2", livechat: "000000000000000000" },
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
				enabled: true,
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

	public bot: Bot = createBot({
		host: this.config.serverInfo.ip,
		username: this.config.username,
		version: this.config.serverInfo.version,
		auth: this.config.serverInfo.auth,
		hideErrors: true,
	});
	public client: Discord;

	constructor(client: Discord, serverInfo: ServerInfo) {
		this.client = client;
		this.config.dev = this.client.dev;
		this.config.serverInfo = serverInfo;
		this.config.livechat.channelId = serverInfo.livechat;

		if (this.config.serverInfo.auth == "offline")
			this.config.username = process.env.USERNAME;

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
		this.start();
	}

	private start() {
		this.bot.loadPlugin(pathfinder);

		this.loadEvents();
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