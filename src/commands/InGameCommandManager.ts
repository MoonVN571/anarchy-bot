import { Minecraft } from "../structures";
import { commandManager } from "./CommandManager";

export class InGameCommandManager {
	private cooldowns: Map<string, number> = new Map();
	private readonly COOLDOWN_MS = 3000; // 3 seconds per player

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
				// Reply back to user via Minecraft whisper
				bot.bot.chat(`/w ${cleanSender} ${response}`);
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
}

export const inGameCommandManager = new InGameCommandManager();
