import { Events } from 'discord.js';
import { Discord } from '../structures';
import { readdirSync } from 'fs';

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

export async function loadDiscordEvents(client: Discord): Promise<void> {
	const events = readdirSync("./dist/events/client");
	for (const eventFile of events) {
		try {
			const eventName = eventFile.split(".")[0];
			const eventStruct = await import(`../events/client/${eventName}.js`);
			const event = new eventStruct.default() as DiscordEvent;
			
			if (!event) {
				client.logger.warn(`Failed to load event: ${eventName} - Event is undefined`);
				continue;
			}
			
			if (event.once) 
				client.once(event.name as any, (...p) => event.execute(client, ...p));
			else 
				client.on(event.name as any, (...p) => event.execute(client, ...p));
			
		} catch (error) {
			client.logger.error(`Error loading event ${eventFile}: ${error}`);
		}
	}
}
