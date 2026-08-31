import { TextChannel, ContainerBuilder, APIEmbed } from "discord.js";
import { Minecraft } from "./Minecraft";
import { ParsedChatMessage, MessageType } from "../utils/chatParser";
import { MessageV2Renderer } from "../utils/messageV2Renderer";
import { MessageRenderer } from "../utils/messageRenderer";
import { SpamDetector } from "../utils/spamDetector";

interface QueuedMessage {
	parsed: ParsedChatMessage;
	serverHost: string;
	timestamp: number;
	repeatCount: number;
	signature: string;
}

export class LiveChatManager {
	private static readonly MAX_CONTAINERS_PER_MESSAGE = 5;
	private static readonly MAX_EMBEDS_PER_MESSAGE = 10;
	private static readonly FLUSH_DEBOUNCE_MS = 600;
	private static readonly MIN_SEND_INTERVAL_MS = 800;
	private static readonly MAX_QUEUE_SIZE = 100;
	private static readonly SPAM_MERGE_WINDOW_MS = 15 * 1000;

	private main: Minecraft;
	private queue: QueuedMessage[] = [];
	private isProcessing = false;
	private flushTimer: NodeJS.Timeout | null = null;
	private cooldownUntil = 0;
	private lastSendTime = 0;

	// In-game chat sliding window rate limiter
	private messageWindow: number[] = [];
	private burstCounter = 0;
	private serverRateLimited = false;

	constructor(main: Minecraft) {
		this.main = main;
	}

	/**
	 * Enqueue a parsed chat message / event for batched sending, merging duplicate spam
	 */
	public async push(parsed: ParsedChatMessage): Promise<void> {
		if (!parsed.formattedMsg && !parsed.message) return;
		if (parsed.type === MessageType.BotChat) return;

		const channel = this.main.channel as TextChannel;
		if (!channel) {
			this.main.resolveChannel();
			if (!this.main.channel) return;
		}

		const serverHost = this.main.config.connection.host;
		const signature = SpamDetector.getSignature(parsed, serverHost);
		const now = Date.now();

		// Check server-level rate limiter config
		this.handleServerRateLimit();

		// Check if identical message already exists in queue to merge with [xN]
		const existingItem = this.queue.find(
			item => item.serverHost === serverHost &&
				item.signature === signature &&
				now - item.timestamp < LiveChatManager.SPAM_MERGE_WINDOW_MS
		);

		if (existingItem) {
			existingItem.repeatCount++;
			existingItem.timestamp = now;
			existingItem.parsed = parsed; // Use latest timestamp/metadata
			this.scheduleFlush();
			return;
		}

		// Prevent queue from growing unbounded
		if (this.queue.length >= LiveChatManager.MAX_QUEUE_SIZE) {
			this.queue.shift(); // Drop oldest message to prevent memory leaks
		}

		this.queue.push({
			parsed,
			serverHost,
			timestamp: now,
			repeatCount: 1,
			signature,
		});

		// Trigger debounce flush
		this.scheduleFlush();
	}

	/**
	 * Schedule a queue flush with debounce
	 */
	private scheduleFlush(delayMs: number = LiveChatManager.FLUSH_DEBOUNCE_MS): void {
		if (this.flushTimer) return;

		// If queue is full (>= MAX_CONTAINERS_PER_MESSAGE) and cooldown has passed, flush immediately
		if (this.queue.length >= LiveChatManager.MAX_CONTAINERS_PER_MESSAGE && Date.now() >= this.cooldownUntil) {
			this.processQueue();
			return;
		}

		const waitTime = Math.max(delayMs, this.cooldownUntil - Date.now(), 0);
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			this.processQueue();
		}, waitTime);
	}

	/**
	 * Process queued messages in batches of up to MAX_CONTAINERS_PER_MESSAGE
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;
		if (this.queue.length === 0) return;

		const now = Date.now();
		if (now < this.cooldownUntil) {
			this.scheduleFlush(this.cooldownUntil - now);
			return;
		}

		const channel = this.main.channel as TextChannel;
		if (!channel) {
			this.main.resolveChannel();
			if (!this.main.channel) return;
		}

		this.isProcessing = true;

		try {
			// Enforce minimum interval between consecutive Discord API calls
			const elapsedSinceLastSend = Date.now() - this.lastSendTime;
			if (elapsedSinceLastSend < LiveChatManager.MIN_SEND_INTERVAL_MS) {
				await new Promise(resolve => setTimeout(resolve, LiveChatManager.MIN_SEND_INTERVAL_MS - elapsedSinceLastSend));
			}

			// Take batch of messages for this server
			const serverHost = this.main.config.connection.host;
			const batchItems: QueuedMessage[] = [];
			const remaining: QueuedMessage[] = [];

			for (const item of this.queue) {
				if (item.serverHost === serverHost && batchItems.length < LiveChatManager.MAX_CONTAINERS_PER_MESSAGE) {
					batchItems.push(item);
				} else {
					remaining.push(item);
				}
			}

			if (batchItems.length === 0) {
				this.isProcessing = false;
				return;
			}

			// Attempt dispatch with multi-tier fallback
			const sentSuccessfully = await this.dispatchBatch(channel, batchItems);

			if (sentSuccessfully) {
				this.lastSendTime = Date.now();
				this.queue = remaining;
			}
		} catch (err: any) {
			this.handleSendError(err);
		} finally {
			this.isProcessing = false;

			// If there are still items in the queue, schedule the next batch
			if (this.queue.length > 0) {
				this.scheduleFlush(LiveChatManager.MIN_SEND_INTERVAL_MS);
			}
		}
	}

	/**
	 * Dispatch batch to Discord using Components V2 ContainerBuilder with fallbacks
	 */
	private async dispatchBatch(channel: TextChannel, items: QueuedMessage[]): Promise<boolean> {
		const serverHost = this.main.config.connection.host;

		// 1. Primary Method: Group up to 5 ContainerBuilders in a single message
		try {
			const containers: ContainerBuilder[] = items.map(item =>
				MessageV2Renderer.renderContainer(item.parsed, serverHost, item.repeatCount)
			);

			await channel.send({
				components: containers,
				flags: "IsComponentsV2",
			});
			return true;
		} catch (err: any) {
			// Check if this error is a Discord 429 rate limit
			if (this.isRateLimitError(err)) {
				this.handleSendError(err);
				return false; // Leave in queue to retry after cooldown
			}

			this.main.client.logger.debug(
				"LiveChat",
				`Multi-container send failed (${err?.message || err}), attempting fallbacks...`
			);
		}

		// 2. Fallback Tier 1: Send containers one-by-one (in case Discord rejected batch containers)
		try {
			for (const item of items) {
				const container = MessageV2Renderer.renderContainer(item.parsed, serverHost, item.repeatCount);
				await channel.send({
					components: [container],
					flags: "IsComponentsV2",
				});
				await new Promise(r => setTimeout(r, 200));
			}
			return true;
		} catch (err: any) {
			if (this.isRateLimitError(err)) {
				this.handleSendError(err);
				return false;
			}

			this.main.client.logger.debug(
				"LiveChat",
				`Single container send failed (${err?.message || err}), falling back to Discord Embeds...`
			);
		}

		// 3. Fallback Tier 2: Send as standard Discord Embeds (up to 10 embeds per message)
		try {
			const embeds: APIEmbed[] = items.slice(0, LiveChatManager.MAX_EMBEDS_PER_MESSAGE).map(item =>
				MessageRenderer.renderEmbed(item.parsed, serverHost, item.repeatCount)
			);

			await channel.send({ embeds });
			return true;
		} catch (err: any) {
			if (this.isRateLimitError(err)) {
				this.handleSendError(err);
				return false;
			}

			this.main.client.logger.debug(
				"LiveChat",
				`Embeds send failed (${err?.message || err}), falling back to plain text...`
			);
		}

		// 4. Fallback Tier 3: Send as plain text markdown
		try {
			const textLines = items.map(item => {
				const p = item.parsed;
				const countTag = item.repeatCount > 1 ? ` [x${item.repeatCount}]` : "";
				if (p.username && p.message) {
					const rank = p.rank ? `[${p.rank}] ` : "";
					return `**${rank}${p.username}**${countTag}: ${p.message}`;
				}
				return `> ${p.formattedMsg || p.rawText}${countTag}`;
			});

			await channel.send({
				content: textLines.join("\n").slice(0, 2000),
			});
			return true;
		} catch (err: any) {
			this.handleSendError(err);
			return false;
		}
	}

	/**
	 * Determine if an error is a Discord Rate Limit (429)
	 */
	private isRateLimitError(err: any): boolean {
		if (!err) return false;
		if (err.status === 429 || err.code === 429) return true;
		if (err.retryAfter !== undefined || err.rawError?.retry_after !== undefined) return true;
		if (typeof err.message === "string" && err.message.toLowerCase().includes("rate limit")) return true;
		return false;
	}

	/**
	 * Handle errors and extract retryAfter for backoff
	 */
	private handleSendError(err: any): void {
		let retryAfterMs = 3000;

		if (err) {
			if (typeof err.retryAfter === "number") {
				retryAfterMs = err.retryAfter > 100 ? err.retryAfter : err.retryAfter * 1000;
			} else if (typeof err.rawError?.retry_after === "number") {
				const val = err.rawError.retry_after;
				retryAfterMs = val > 100 ? val : val * 1000;
			} else if (err.data?.retry_after) {
				const val = Number(err.data.retry_after);
				retryAfterMs = val > 100 ? val : val * 1000;
			}
		}

		this.cooldownUntil = Date.now() + retryAfterMs + 500;

		this.main.client.logger.warn(
			`Discord livechat rate limit / send delay on ${this.main.config.connection.host}. Pausing for ${retryAfterMs}ms.`
		);

		this.scheduleFlush(retryAfterMs + 500);
	}

	/**
	 * Handle server in-game chat rate limiter
	 */
	private handleServerRateLimit(): void {
		const rateLimit = this.main.config.livechat?.rateLimit;
		if (!rateLimit || !rateLimit.enabled) return;

		const now = Date.now();
		this.messageWindow.push(now);

		// Remove old entries outside sliding window
		this.messageWindow = this.messageWindow.filter(
			timestamp => now - timestamp < rateLimit.windowSize
		);

		// Track burst counter
		this.burstCounter++;
		setTimeout(() => this.burstCounter--, rateLimit.burstInterval);

		const windowExceeded = this.messageWindow.length > rateLimit.messageThreshold;
		const burstExceeded = this.burstCounter > rateLimit.burstThreshold;

		if ((windowExceeded || burstExceeded) && !this.serverRateLimited) {
			this.serverRateLimited = true;

			setTimeout(() => {
				this.serverRateLimited = false;
			}, rateLimit.time);

			this.main.client.logger.warn(
				`Livechat in-game rate limit triggered for ${this.main.config.connection.host}, throttling for ${rateLimit.time}ms`
			);
		}
	}

	/**
	 * Clear active queue and timers
	 */
	public clear(): void {
		if (this.flushTimer) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		this.queue = [];
		this.isProcessing = false;
	}

	public destroy(): void {
		this.clear();
	}
}
