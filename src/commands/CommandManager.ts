import { Message } from "discord.js";
import { Command } from "../typings";
import { Discord, Minecraft } from "../structures";
import {
	HighwayCommand,
	GotoCommand,
	StopCommand,
	FollowCommand,
	CoordsCommand,
	TotemCommand,
} from "./ingame";
import { BotStatusCommand } from "./discord";
import {
	HelpCommand,
	DiscordInviteCommand,
	JoinDateCommand,
	SeenCommand,
	StatsCommand,
	KillCommand,
	PingCommand,
	TpsCommand,
	KdCommand,
	PlaytimeCommand,
	TopCommand,
	QuoteCommand,
	OnlineCommand,
	FirstMessageCommand,
	LastMessageCommand,
	TablistCommand,
} from "./shared";
import { removeVietnameseDiacritics } from "../utils";

export class CommandManager {
	private commands: Map<string, Command> = new Map();
	private aliases: Map<string, Command> = new Map();

	constructor() {
		this.registerDefaultCommands();
	}

	public registerCommand(command: Command): void {
		const nameLower = command.name.toLowerCase().trim();
		this.commands.set(nameLower, command);
		const nameStripped = removeVietnameseDiacritics(nameLower);
		if (nameStripped !== nameLower) {
			this.aliases.set(nameStripped, command);
		}

		for (const alias of command.aliases) {
			const aliasLower = alias.toLowerCase().trim();
			this.aliases.set(aliasLower, command);
			const aliasStripped = removeVietnameseDiacritics(aliasLower);
			if (aliasStripped !== aliasLower) {
				this.aliases.set(aliasStripped, command);
			}
		}
	}

	public getCommand(nameOrAlias: string): Command | undefined {
		if (!nameOrAlias) return undefined;
		const lower = nameOrAlias.toLowerCase().trim();
		const direct = this.commands.get(lower) || this.aliases.get(lower);
		if (direct) return direct;

		// Try removing Vietnamese diacritics (e.g. "trợgiúp" -> "trogiup", "dừng" -> "dung")
		const stripped = removeVietnameseDiacritics(lower);
		const strippedMatch = this.commands.get(stripped) || this.aliases.get(stripped);
		if (strippedMatch) return strippedMatch;

		// Try stripping underscores / dashes
		const cleanUnderscores = stripped.replace(/[_-]/g, "");
		return this.commands.get(cleanUnderscores) || this.aliases.get(cleanUnderscores);
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
			await message.reply({ content: `Đã xảy ra lỗi khi thực thi lệnh \`>${cmdName}\`.` }).catch(() => { });
			return true;
		}
	}

	private registerDefaultCommands(): void {
		// Ingame commands
		this.registerCommand(new HighwayCommand());
		this.registerCommand(new GotoCommand());
		this.registerCommand(new StopCommand());
		this.registerCommand(new FollowCommand());
		this.registerCommand(new CoordsCommand());
		this.registerCommand(new TotemCommand());

		// Discord commands
		this.registerCommand(new BotStatusCommand());

		// Shared commands
		this.registerCommand(new KdCommand());
		this.registerCommand(new StatsCommand());
		this.registerCommand(new PlaytimeCommand());
		this.registerCommand(new QuoteCommand());
		this.registerCommand(new TopCommand());
		this.registerCommand(new OnlineCommand());
		this.registerCommand(new TablistCommand());
		this.registerCommand(new JoinDateCommand());
		this.registerCommand(new SeenCommand());
		this.registerCommand(new FirstMessageCommand());
		this.registerCommand(new LastMessageCommand());
		this.registerCommand(new DiscordInviteCommand());
		this.registerCommand(new KillCommand());
		this.registerCommand(new PingCommand());
		this.registerCommand(new TpsCommand());
		this.registerCommand(new HelpCommand(this));
	}
}

export const commandManager = new CommandManager();
