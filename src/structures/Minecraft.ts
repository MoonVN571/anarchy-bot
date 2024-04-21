import { Bot, createBot } from "mineflayer";
import { readdirSync } from "fs";
import { pathfinder } from "mineflayer-pathfinder";
import { TextChannel } from "discord.js";
import { config } from "dotenv";
import { Discord } from ".";
import { MineflayerOptions, Server, ServerInfo } from "../types";
config();

export class Minecraft {
	public bot: Bot;
	public client: Discord;

	public currentServer: Server;
	public uptime: number;
	public channel: TextChannel;
	public joined: boolean;
	public spawnCount = 0;

	public readonly dev: boolean;
	public readonly config: MineflayerOptions = {
		username: process.env.EMAIL,
		password: process.env.PASSWORD,
		authme: process.env.AUTHME,
		pin: process.env.PIN?.split(""),
		auth: "microsoft",
		reconnectInterval: 5 * 60 * 1000,
		livechat: {
			// displayName, message
			chat: "> [{displayName}] {message} | bit.ly/mo0nbot",
			rateLimitFlags: {
				enabled: true,
				time: 2 * 60 * 1000,
				keepCountTime: 2 * 1000,
				flaggedCount: 5,
				minimumEmbeds: 5,
			},
			topic: {
				enabled: true,
				interval: 5 * 1000 + 10 * 60 * 1000,
			},
			autoMessage: {
				enabled: true,
				msgs: [
					// "Server lưu trữ tin nhắn hơn 25.000 players và hơn 11 triệu tin nhắn tại discord: bit.ly/mo0nbot2",
					"Bot đời đầu tại 2y2c anarchy, ghé discord bit.ly/mo0nbot2 để ủng hộ <3",
					"Cập nhật livechat các server anarchy tại: bit.ly/mo0nbot2",
					"Tin nhắn được gửi mỗi 15 phút, hiện tại là {time}"
				],
				interval: 15 * 60 * 1000,
			},
		},
	};

	constructor(client: Discord, serverInfo: ServerInfo) {
		this.client = client;
		this.config.dev = this.client.dev;
		this.config.serverInfo = serverInfo;
		this.config.livechat.channelId = serverInfo.livechat;

		if (this.config.serverInfo.auth == "offline")
			this.config.username = process.env.USERNAME;

		this.client.on("messageCreate", message => {
			if (message.author.bot || !this.joined || this.currentServer !== Server.Main) return;
			if (message.channel?.id === this.config.livechat.channelId) {
				if (message.content.startsWith(">")
					|| !message.content) return;
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
		this.bot = createBot({
			host: this.config.serverInfo.ip,
			username: this.config.username,
			version: this.config.serverInfo.version,
			auth: this.config.serverInfo.auth,
		});
		this.bot.loadPlugin(pathfinder);

		this.loadEvents();
	}

	/* eslint-disable @typescript-eslint/no-explicit-any */
	private loadEvents() {
		readdirSync((this.client.dev ? "./src" : "./dist") + "/events/mineflayer").forEach(async event => {
			const eventName = event.split(".")[0];
			const data = await import(`../events/mineflayer/${eventName}`);
			this.bot.on(eventName as any, (...p: any) => data.execute(this, ...p));
		});
	}
}