import { APIEmbed, TextChannel } from "discord.js";
import { Minecraft } from "./Minecraft";
import { ParsedChatMessage, messageColors } from "../utils/chatParser";
import { ServerIp } from "../typings/types";

interface QueuedMessage {
	msg: string;
	type: string;
	server: ServerIp;
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

		this.messages.push({
			type: parsed.type,
			msg: parsed.formattedMsg,
			server: this.main.config.serverInfo.ip,
		});

		this.handleRateLimit();
		this.sendMessagesToChannel();
	}

	private handleRateLimit(): void {
		const { rateLimitFlags } = this.main.config.livechat;
		if (!rateLimitFlags.enabled) return;

		const now = Date.now();
		this.messageWindow.push(now);

		// Remove old entries outside the window
		this.messageWindow = this.messageWindow.filter(
			timestamp => now - timestamp < rateLimitFlags.windowSize
		);

		// Track burst counter
		this.burstCounter++;
		setTimeout(() => this.burstCounter--, rateLimitFlags.burstInterval);

		const windowExceeded = this.messageWindow.length > rateLimitFlags.messageThreshold;
		const burstExceeded = this.burstCounter > rateLimitFlags.burstThreshold;

		if ((windowExceeded || burstExceeded) && !this.rateLimited) {
			this.rateLimited = true;

			setTimeout(() => {
				this.rateLimited = false;
				if (this.messages.some(msg => msg.server === this.main.config.serverInfo.ip)) {
					this.sendMessagesToChannel();
				}
			}, rateLimitFlags.time);

			this.main.client.logger.warn(
				`Rate limit triggered for ${this.main.config.serverInfo.ip}, delaying messages for ${rateLimitFlags.time}ms`
			);
		}
	}

	private sendMessagesToChannel(): void {
		const channel = this.main.channel as TextChannel;
		if (!channel) return;

		const embeds = this.generateEmbeds();
		const { rateLimitFlags } = this.main.config.livechat;

		if (this.rateLimited && embeds.length < rateLimitFlags.minimumEmbeds) return;

		if (embeds.length > 0) {
			channel.send({ embeds }).catch(err => {
				this.main.client.logger.error(`Error sending livechat message: ${err}`);
			});
			this.messages = this.messages.filter(msg => msg.server !== this.main.config.serverInfo.ip);
		}
	}

	private generateEmbeds(): APIEmbed[] {
		const embeds: APIEmbed[] = [];
		const serverMessages = this.messages.filter(msg => msg.server === this.main.config.serverInfo.ip);

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

			const color = (messageColors as any)[currentMsg.type] || 0x979797;

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
