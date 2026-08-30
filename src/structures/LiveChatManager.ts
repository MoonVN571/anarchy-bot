import { TextChannel } from "discord.js";
import { Minecraft } from "./Minecraft";
import { ParsedChatMessage, MessageType } from "../utils/chatParser";
import { MessageV2Renderer } from "../utils/messageV2Renderer";

interface QueuedEventMessage {
	parsed: ParsedChatMessage;
	serverHost: string;
}

export class LiveChatManager {
	private main: Minecraft;
	private eventQueue: QueuedEventMessage[] = [];
	private rateLimited = false;
	private messageWindow: number[] = [];
	private burstCounter = 0;

	constructor(main: Minecraft) {
		this.main = main;
	}

	public async push(parsed: ParsedChatMessage): Promise<void> {
		if (!parsed.formattedMsg && !parsed.message) return;
		if (parsed.type === MessageType.BotChat) return;

		const channel = this.main.channel as TextChannel;
		if (!channel) return;

		const serverHost = this.main.config.connection.host;

		// 1. Dispatch Player Chat via Discord Components V2 Container (Skin Head Avatar Section)
		if (
			(parsed.type === MessageType.Chat || parsed.type === MessageType.HighlightChat) &&
			parsed.username
		) {
			const container = MessageV2Renderer.renderPlayerChatContainer(parsed);

			try {
				await channel.send({
					components: [container],
					flags: "IsComponentsV2",
				});
				return;
			} catch (err) {
				this.main.client.logger.debug("LiveChat", `Component V2 send error: ${err}`);
				return;
			}
		}

		// 2. Dispatch PvP Death Event with Dual Player Skin Heads
		if (parsed.type === MessageType.Dead && parsed.killer && parsed.victim) {
			const container = MessageV2Renderer.renderPvPDeathContainer(parsed, serverHost);

			try {
				await channel.send({
					components: [container],
					flags: "IsComponentsV2",
				});
				return;
			} catch (err) {
				this.main.client.logger.debug("LiveChat", `Component V2 send error: ${err}`);
				return;
			}
		}

		// 3. Queue other events (Join, Quit, Mob Death, Server Broadcast, Queue)
		this.eventQueue.push({
			parsed,
			serverHost,
		});

		this.handleRateLimit();
		this.sendEventsToChannel();
	}

	private handleRateLimit(): void {
		const { rateLimit } = this.main.config.livechat;
		if (!rateLimit.enabled) return;

		const now = Date.now();
		this.messageWindow.push(now);

		// Remove old entries outside the sliding window
		this.messageWindow = this.messageWindow.filter(
			timestamp => now - timestamp < rateLimit.windowSize
		);

		// Track burst counter
		this.burstCounter++;
		setTimeout(() => this.burstCounter--, rateLimit.burstInterval);

		const windowExceeded = this.messageWindow.length > rateLimit.messageThreshold;
		const burstExceeded = this.burstCounter > rateLimit.burstThreshold;

		if ((windowExceeded || burstExceeded) && !this.rateLimited) {
			this.rateLimited = true;

			setTimeout(() => {
				this.rateLimited = false;
				if (this.eventQueue.some(msg => msg.serverHost === this.main.config.connection.host)) {
					this.sendEventsToChannel();
				}
			}, rateLimit.time);

			this.main.client.logger.warn(
				`Livechat rate limit triggered for ${this.main.config.connection.host}, delaying messages for ${rateLimit.time}ms`
			);
		}
	}

	private async sendEventsToChannel(): Promise<void> {
		const channel = this.main.channel as TextChannel;
		if (!channel) return;

		const serverEvents = this.eventQueue.filter(msg => msg.serverHost === this.main.config.connection.host);
		if (serverEvents.length === 0) return;

		const { rateLimit } = this.main.config.livechat;
		if (this.rateLimited && serverEvents.length < rateLimit.minimumEmbeds) return;

		// Dispatch each event with Component V2 Container
		for (const item of serverEvents.slice(0, 5)) {
			const container = MessageV2Renderer.renderEventContainer(item.parsed, item.serverHost);

			try {
				await channel.send({
					components: [container],
					flags: "IsComponentsV2",
				});
			} catch (err) {
				this.main.client.logger.debug("LiveChat", `Component V2 send error for event: ${err}`);
			}
		}

		this.eventQueue = this.eventQueue.filter(msg => msg.serverHost !== this.main.config.connection.host);
	}
}
