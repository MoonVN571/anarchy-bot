import { Minecraft } from "../structures";
import { commandManager } from "./CommandManager";

export class InGameCommandManager {
	private cooldowns: Map<string, number> = new Map();
	private readonly COOLDOWN_MS = 3000; // 3 seconds per player
	private readonly MAX_CHUNK_LENGTH = 160; // Max safe characters per whisper message
	private readonly MESSAGE_DELAY_MS = 300; // Delay between multiple whisper packets

	/**
	 * Handle in-game command (messages starting with "!")
	 * Returns true if the message was an in-game command
	 */
	public async handleInGameMessage(
		bot: Minecraft,
		sender: string,
		message: string
	): Promise<boolean> {
		if (!message || !sender) return false;

		const trimmed = message.trim();
		if (!trimmed.startsWith("!")) return false;

		// Don't execute commands from the bot itself
		if (bot.bot?.username && sender.toLowerCase() === bot.bot.username.toLowerCase()) {
			return false;
		}

		const cleanSender = sender.trim();
		const lowerSender = cleanSender.toLowerCase();

		// Cooldown check per player
		const now = Date.now();
		const lastUsed = this.cooldowns.get(lowerSender) || 0;
		if (now - lastUsed < this.COOLDOWN_MS) {
			return true;
		}
		this.cooldowns.set(lowerSender, now);

		const raw = trimmed.slice(1).trim();
		if (!raw) return false;

		const [cmdName, ...args] = raw.split(/\s+/);
		const command = commandManager.getCommand(cmdName);

		if (!command) {
			return false;
		}

		try {
			const response = await command.executeInGame({
				bot,
				sender: cleanSender,
				commandName: cmdName,
				args,
				serverHost: bot.config.connection.host,
			});

			if (response && bot.bot) {
				await this.sendWhisperResponses(bot, cleanSender, response);
				bot.client.logger.debug(
					"InGameCommand",
					`[${bot.config.connection.host}] Executed !${cmdName} for ${cleanSender} -> Whispered reply.`
				);
			}

			return true;
		} catch (error) {
			bot.client.logger.error(`[InGameCommandManager] Error executing !${cmdName} for ${cleanSender}: ${error}`);
			return true;
		}
	}

	/**
	 * Send one or multiple whisper responses cleanly to the player
	 */
	private async sendWhisperResponses(
		bot: Minecraft,
		recipient: string,
		response: string | string[]
	): Promise<void> {
		if (!bot.bot) return;

		// Normalize response into list of lines
		let rawLines: string[] = [];
		if (Array.isArray(response)) {
			rawLines = response.flatMap(r => r.split("\n"));
		} else {
			rawLines = response.split("\n");
		}

		// Clean and chunk lines that are too long
		const linesToSend: string[] = [];
		for (const rawLine of rawLines) {
			const trimmed = rawLine.trim();
			if (!trimmed) continue;

			if (trimmed.length <= this.MAX_CHUNK_LENGTH) {
				linesToSend.push(trimmed);
			} else {
				// Split into natural word chunks
				const chunks = this.chunkText(trimmed, this.MAX_CHUNK_LENGTH);
				linesToSend.push(...chunks);
			}
		}

		// Send each whisper with a slight interval
		for (let i = 0; i < linesToSend.length; i++) {
			try {
				bot.bot.chat(`/w ${recipient} ${linesToSend[i]}`);
			} catch {}

			if (i < linesToSend.length - 1) {
				await new Promise(r => setTimeout(r, this.MESSAGE_DELAY_MS));
			}
		}
	}

	/**
	 * Break long text into chunks at natural word boundaries
	 */
	private chunkText(text: string, maxLength: number): string[] {
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
}

export const inGameCommandManager = new InGameCommandManager();
