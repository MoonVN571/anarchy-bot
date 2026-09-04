import { Minecraft } from "../../structures";

export enum ChatPriority {
	HIGH = 0,    // AuthMe (/login, /reg, /pin), Emergency (/kill), navigation critical
	COMMAND = 1, // In-game command whisper responses (/tell, /w)
	NORMAL = 2,  // Discord LiveChat relay
	LOW = 3,     // Auto tips, periodic broadcast messages
}

export interface ChatQueueItem {
	id: string;
	message: string;
	priority: ChatPriority;
	addedAt: number;
	recipient?: string; // Defined if sending a whisper
}

export class ChatQueueService {
	private bot: Minecraft;
	private queue: ChatQueueItem[] = [];
	private isProcessing = false;
	private processTimer: NodeJS.Timeout | null = null;
	private lastSentTimestamp = 0;
	private lastSentMessage = "";
	private lastSentMessageTime = 0;

	public readonly DEFAULT_INTERVAL_MS = 800; // Safe interval between chat messages
	public readonly MAX_QUEUE_SIZE = 25; // Maximum items allowed in outbox queue
	public readonly MAX_CHUNK_LENGTH = 160; // Max characters per Minecraft chat line
	public readonly ANTI_DUPLICATE_WINDOW_MS = 2000; // Ignore identical public messages within 2s

	constructor(bot: Minecraft) {
		this.bot = bot;
	}

	/**
	 * Send a public chat message with given priority
	 */
	public send(message: string, priority: ChatPriority = ChatPriority.NORMAL): boolean {
		if (!message || typeof message !== "string") return false;

		const trimmed = message.trim();
		if (!trimmed) return false;

		const chunks = this.splitIntoChunks(trimmed, this.MAX_CHUNK_LENGTH);
		for (const chunk of chunks) {
			this.enqueueItem({
				id: Math.random().toString(36).slice(2, 9),
				message: chunk,
				priority,
				addedAt: Date.now(),
			});
		}

		this.triggerProcess();
		return true;
	}

	/**
	 * Send one or multiple whisper messages cleanly to a recipient with given priority
	 */
	public sendWhisper(
		recipient: string,
		response: string | string[],
		priority: ChatPriority = ChatPriority.COMMAND
	): boolean {
		if (!recipient || !response) return false;

		let rawLines: string[] = [];
		if (Array.isArray(response)) {
			rawLines = response.flatMap(r => r.split("\n"));
		} else {
			rawLines = response.split("\n");
		}

		const linesToSend: string[] = [];
		for (const rawLine of rawLines) {
			const trimmed = rawLine.trim();
			if (!trimmed) continue;

			if (trimmed.length <= this.MAX_CHUNK_LENGTH) {
				linesToSend.push(trimmed);
			} else {
				linesToSend.push(...this.splitIntoChunks(trimmed, this.MAX_CHUNK_LENGTH));
			}
		}

		for (const line of linesToSend) {
			this.enqueueItem({
				id: Math.random().toString(36).slice(2, 9),
				message: line,
				priority,
				addedAt: Date.now(),
				recipient,
			});
		}

		this.triggerProcess();
		return true;
	}

	/**
	 * Enqueue item with priority ordering and queue overflow protection
	 */
	private enqueueItem(item: ChatQueueItem): void {
		// Anti-overflow: If queue size exceeds maximum, drop the oldest LOW or NORMAL priority item
		if (this.queue.length >= this.MAX_QUEUE_SIZE) {
			const dropIndex = this.queue.findIndex(
				q => q.priority === ChatPriority.LOW || q.priority === ChatPriority.NORMAL
			);
			if (dropIndex !== -1) {
				const dropped = this.queue.splice(dropIndex, 1)[0];
				this.bot.client.logger.warn(
					`[ChatQueue] [${this.bot.config.connection.host}] Queue full (${this.MAX_QUEUE_SIZE}). Dropped item: "${dropped.message.slice(0, 30)}..."`
				);
			}
		}

		this.queue.push(item);

		// Sort by priority (ascending: HIGH=0 first), then by FIFO addedAt
		this.queue.sort((a, b) => {
			if (a.priority !== b.priority) {
				return a.priority - b.priority;
			}
			return a.addedAt - b.addedAt;
		});
	}

	/**
	 * Trigger queue processing
	 */
	private triggerProcess(): void {
		if (this.isProcessing || this.queue.length === 0) return;

		const now = Date.now();
		const timeSinceLast = now - this.lastSentTimestamp;

		if (timeSinceLast >= this.DEFAULT_INTERVAL_MS) {
			this.processNext();
		} else if (!this.processTimer) {
			const delay = this.DEFAULT_INTERVAL_MS - timeSinceLast;
			this.processTimer = setTimeout(() => {
				this.processTimer = null;
				this.processNext();
			}, delay);
		}
	}

	/**
	 * Process next item in the queue
	 */
	private processNext(): void {
		if (!this.bot.bot || this.queue.length === 0) {
			this.isProcessing = false;
			return;
		}

		this.isProcessing = true;
		const item = this.queue.shift();
		if (!item) {
			this.isProcessing = false;
			return;
		}

		// Anti-duplicate check for public chat (ignore identical messages within window)
		if (
			!item.recipient &&
			item.message === this.lastSentMessage &&
			Date.now() - this.lastSentMessageTime < this.ANTI_DUPLICATE_WINDOW_MS
		) {
			this.bot.client.logger.debug(
				"ChatQueue",
				`[${this.bot.config.connection.host}] Suppressed duplicate public message: "${item.message}"`
			);
			this.isProcessing = false;
			this.triggerProcess();
			return;
		}

		try {
			if (item.recipient) {
				if (typeof (this.bot.bot as any).whisper === "function") {
					(this.bot.bot as any).whisper(item.recipient, item.message);
				} else {
					this.bot.bot.chat(`/tell ${item.recipient} ${item.message}`);
				}
			} else {
				this.bot.bot.chat(item.message);
			}

			this.lastSentTimestamp = Date.now();
			if (!item.recipient) {
				this.lastSentMessage = item.message;
				this.lastSentMessageTime = Date.now();
			}
		} catch (error) {
			this.bot.client.logger.error(
				`[ChatQueue] Error sending message on ${this.bot.config.connection.host}: ${error}`
			);
		}

		this.isProcessing = false;

		// Schedule next item if queue still has items
		if (this.queue.length > 0) {
			if (this.processTimer) {
				clearTimeout(this.processTimer);
			}
			this.processTimer = setTimeout(() => {
				this.processTimer = null;
				this.processNext();
			}, this.DEFAULT_INTERVAL_MS);
		}
	}

	/**
	 * Split text into chunks at natural word boundaries
	 */
	private splitIntoChunks(text: string, maxLength: number): string[] {
		const words = text.split(" ");
		const chunks: string[] = [];
		let currentChunk = "";

		for (const word of words) {
			if (!currentChunk) {
				currentChunk = word;
			} else if (currentChunk.length + 1 + word.length <= maxLength) {
				currentChunk += " " + word;
			} else {
				chunks.push(currentChunk);
				currentChunk = word;
			}
		}

		if (currentChunk) {
			chunks.push(currentChunk);
		}

		return chunks;
	}

	/**
	 * Clear all queued items
	 */
	public clear(): void {
		this.queue = [];
	}

	/**
	 * Stop active processing timer and clear queue
	 */
	public stop(): void {
		if (this.processTimer) {
			clearTimeout(this.processTimer);
			this.processTimer = null;
		}
		this.isProcessing = false;
		this.clear();
	}

	/**
	 * Get current queue length
	 */
	public getQueueLength(): number {
		return this.queue.length;
	}
}
