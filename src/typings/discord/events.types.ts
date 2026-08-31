import { Events } from "discord.js";
import { Discord } from "../../structures";

export interface DiscordEventOptions {
	name: Events;
	once?: boolean;
}

export class DiscordEvent {
	public name: Events;
	public once: boolean;

	constructor(options: DiscordEventOptions) {
		this.name = options.name;
		this.once = options.once || false;
	}

	// eslint-disable-next-line
	public execute(client: Discord, ...args: any[]): void | Promise<void> {
		throw new Error(`Event ${this.name} doesn't have an execute() method.`);
	}
}
