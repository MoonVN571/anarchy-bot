import { ChatPriority } from "../services";
import { Minecraft } from "../structures";
import { commandManager } from "./CommandManager";

export class InGameCommandManager {
	private cooldowns: Map<string, number> = new Map();
	private readonly COOLDOWN_MS = 1000; // 1 second per player

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

		// Extract clean username (alphanumeric + underscore, 3-16 chars)
		const userMatch = sender.match(/[a-zA-Z0-9_]{3,16}/);
		const cleanSender = userMatch ? userMatch[0] : sender.replace(/[^a-zA-Z0-9_]/g, "");
		if (!cleanSender) return false;

		// Don't execute commands from the bot itself
		if (bot.bot?.username && cleanSender.toLowerCase() === bot.bot.username.toLowerCase()) {
			return false;
		}

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
				bot.chatQueue.sendWhisper(cleanSender, response, ChatPriority.COMMAND);
				bot.client.logger.info(
					`[InGameCommand] Executed !${cmdName} for ${cleanSender} on ${bot.config.connection.host}`
				);
			}

			return true;
		} catch (error) {
			bot.client.logger.error(`[InGameCommandManager] Error executing !${cmdName} for ${cleanSender}: ${error}`);
			return true;
		}
	}
}

export const inGameCommandManager = new InGameCommandManager();

