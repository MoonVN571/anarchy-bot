import { Message } from "discord.js";
import { Discord } from "./Discord";
import { Minecraft } from "./Minecraft";
import { MinecraftServerConfig } from "../typings";
import { Server } from "../typings";
import { commandManager } from "../commands";

export class MinecraftBotManager {
	public client: Discord;
	public bots: Map<string, Minecraft> = new Map();
	private channelToBotMap: Map<string, Minecraft> = new Map();

	constructor(client: Discord) {
		this.client = client;
		this.registerDiscordChatListener();
	}

	public addServer(config: MinecraftServerConfig): Minecraft {
		if (this.bots.has(config.id)) {
			this.client.logger.warn(`Server bot ${config.id} is already registered. Destroying previous instance.`);
			this.removeServer(config.id);
		}

		const botInstance = new Minecraft(this.client, config);
		this.bots.set(config.id, botInstance);

		if (config.livechat.channelId) {
			this.channelToBotMap.set(config.livechat.channelId, botInstance);
		}

		this.client.logger.info(`Registered Minecraft bot instance for server: ${config.name} (${config.id})`);
		return botInstance;
	}

	public removeServer(serverId: string): void {
		const bot = this.bots.get(serverId);
		if (bot) {
			if (bot.config.livechat.channelId) {
				this.channelToBotMap.delete(bot.config.livechat.channelId);
			}
			bot.destroy();
			this.bots.delete(serverId);
			this.client.logger.info(`Removed Minecraft bot instance for server: ${serverId}`);
		}
	}

	public getBot(serverId: string): Minecraft | undefined {
		return this.bots.get(serverId);
	}

	public getBotByChannelId(channelId: string): Minecraft | undefined {
		return this.channelToBotMap.get(channelId);
	}

	private registerDiscordChatListener(): void {
		this.client.on("messageCreate", async (message: Message) => {
			if (message.author.bot || !message.content) return;

			const botInstance = this.channelToBotMap.get(message.channel.id);
			if (!botInstance) return;

			// Handle livechat prefix commands (e.g. >kd, !kd, >stats, !stats, >top, >playtime, etc.)
			if (message.content.startsWith(">") || message.content.startsWith("!")) {
				const handled = await commandManager.handleMessage(this.client, botInstance, message);
				if (handled) return;
			}

			if (!botInstance.joined || botInstance.currentServer !== Server.Main) {
				message.react(this.client.config.emojis.no_chatting).catch(() => { });
				return;
			}

			botInstance.sendChatMessage(message.author.displayName, message.content);
			message.react(this.client.config.emojis.tick).catch(() => { });
		});
	}
}
