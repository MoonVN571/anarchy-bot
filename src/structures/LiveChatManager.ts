import { APIEmbed, TextChannel } from "discord.js";
import { Minecraft } from "./Minecraft";
import { ParsedChatMessage, MessageType, messageColors } from "../utils/chatParser";

interface QueuedMessage {
	msg: string;
	type: string;
	serverHost: string;
}

export class LiveChatManager {
	private main: Minecraft;
	private messages: QueuedMessage[] = [];
	private rateLimited = false;
	private messageWindow: number[] = [];
	private burstCounter = 0;

	constructor(main: Minecraft) {
		this.main = main;
	}

	public push(parsed: ParsedChatMessage): void {
		if (!parsed.formattedMsg) return;
		if (parsed.type === MessageType.BotChat) return;

		this.messages.push({
			type: parsed.type,
			msg: parsed.formattedMsg,
			serverHost: this.main.config.connection.host,
		});

		this.handleRateLimit();
		this.sendMessagesToChannel();
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
				if (this.messages.some(msg => msg.serverHost === this.main.config.connection.host)) {
					this.sendMessagesToChannel();
				}
			}, rateLimit.time);

			this.main.client.logger.warn(
				`Livechat rate limit triggered for ${this.main.config.connection.host}, delaying messages for ${rateLimit.time}ms`
			);
		}
	}

	private sendMessagesToChannel(): void {
		const channel = this.main.channel as TextChannel;
		if (!channel) return;

		const embeds = this.generateEmbeds();
		const { rateLimit } = this.main.config.livechat;

		if (this.rateLimited && embeds.length < rateLimit.minimumEmbeds) return;

		if (embeds.length > 0) {
			channel.send({ embeds }).catch(err => {
				this.main.client.logger.error(`Error sending livechat message: ${err}`);
			});
			this.messages = this.messages.filter(msg => msg.serverHost !== this.main.config.connection.host);
		}
	}

	private generateEmbeds(): APIEmbed[] {
		const embeds: APIEmbed[] = [];
		const serverMessages = this.messages.filter(msg => msg.serverHost === this.main.config.connection.host);

		for (let i = 0; i < serverMessages.length; i++) {
			const prevMsg = serverMessages[i - 1];
			const currentMsg = serverMessages[i];

			if (!currentMsg.msg) continue;

			// Append to previous embed if same type and under character/line limits
			if (
				prevMsg &&
				prevMsg.type === currentMsg.type &&
				embeds.length > 0 &&
				embeds[embeds.length - 1].description &&
				embeds[embeds.length - 1].description!.length < 4096
			) {
				embeds[embeds.length - 1].description = (embeds[embeds.length - 1].description || "") + currentMsg.msg + "\n";

				if (embeds[embeds.length - 1].description!.split("\n").length <= 10) {
					continue;
				}
			}

			const color = (messageColors as Record<string, number>)[currentMsg.type] || 0x979797;

			const embed: APIEmbed = {
				timestamp: new Date().toISOString(),
				description: currentMsg.msg + "\n",
				color: color,
			};

			embeds.push(embed);
		}

		return embeds;
	}
}
