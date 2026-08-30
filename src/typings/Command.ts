import { Message } from "discord.js";
import { Discord, Minecraft } from "../structures";

export interface CommandContext {
	client: Discord;
	bot: Minecraft;
	message: Message;
	commandName: string;
	args: string[];
	serverHost: string;
}

export interface InGameCommandContext {
	bot: Minecraft;
	sender: string;
	commandName: string;
	args: string[];
	serverHost: string;
}

export interface CommandOptions {
	name: string;
	aliases?: string[];
	description: string;
	usage?: string;
	inGameUsage?: string;
}

export abstract class Command {
	public name: string;
	public aliases: string[];
	public description: string;
	public usage: string;
	public inGameUsage: string;

	constructor(options: CommandOptions) {
		this.name = options.name;
		this.aliases = options.aliases || [];
		this.description = options.description;
		this.usage = options.usage || `>${options.name}`;
		this.inGameUsage = options.inGameUsage || `!${options.name}`;
	}

	public abstract execute(ctx: CommandContext): Promise<void> | void;

	public abstract executeInGame(ctx: InGameCommandContext): Promise<string | void> | string | void;
}
