import { Message } from "discord.js";
import { Command } from "../typings/Command";
import { Discord, Minecraft } from "../structures";
import { KdCommand } from "./KdCommand";
import { StatsCommand } from "./StatsCommand";
import { PlaytimeCommand } from "./PlaytimeCommand";
import { QuoteCommand } from "./QuoteCommand";
import { TopCommand } from "./TopCommand";
import { OnlineCommand } from "./OnlineCommand";
import { HelpCommand } from "./HelpCommand";

export class CommandManager {
	private commands: Map<string, Command> = new Map();
	private aliases: Map<string, Command> = new Map();

	constructor() {
		this.registerDefaultCommands();
	}

	public registerCommand(command: Command): void {
		this.commands.set(command.name.toLowerCase(), command);
		for (const alias of command.aliases) {
			this.aliases.set(alias.toLowerCase(), command);
		}
	}

	public getCommand(nameOrAlias: string): Command | undefined {
		const lower = nameOrAlias.toLowerCase();
		return this.commands.get(lower) || this.aliases.get(lower);
	}

	public getAllCommands(): Command[] {
		return Array.from(new Set(this.commands.values()));
	}

	public async handleMessage(client: Discord, bot: Minecraft, message: Message): Promise<boolean> {
		if (!message.content.startsWith(">") && !message.content.startsWith("!")) return false;

		const raw = message.content.slice(1).trim();
		if (!raw) return false;

		const [cmdName, ...args] = raw.split(/\s+/);
		const command = this.getCommand(cmdName);

		if (!command) {
			return false;
		}

		try {
			await command.execute({
				client,
				bot,
				message,
				commandName: cmdName,
				args,
				serverHost: bot.config.connection.host,
			});
			return true;
		} catch (error) {
			client.logger.error(`[CommandManager] Error executing command >${cmdName}: ${error}`);
			await message.reply({ content: `Đã xảy ra lỗi khi thực thi lệnh \`>${cmdName}\`.` }).catch(() => {});
			return true;
		}
	}

	private registerDefaultCommands(): void {
		this.registerCommand(new KdCommand());
		this.registerCommand(new StatsCommand());
		this.registerCommand(new PlaytimeCommand());
		this.registerCommand(new QuoteCommand());
		this.registerCommand(new TopCommand());
		this.registerCommand(new OnlineCommand());
		this.registerCommand(new HelpCommand(this));
	}
}

export const commandManager = new CommandManager();
