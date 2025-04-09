import { BotEvents } from 'mineflayer';
import { Minecraft } from '../structures';
import { readdirSync } from 'fs';

export interface MineflayerEventOptions {
	name: keyof BotEvents;
	once?: boolean;
}

export class MineflayerEvent {
	public name: keyof BotEvents;
	public once: boolean;

	constructor(options: MineflayerEventOptions) {
		this.name = options.name;
		this.once = options.once || false;
	}

	// eslint-disable-next-line
	execute(bot: Minecraft, ...args: any[]): void | Promise<void> {
		throw new Error(`Event ${this.name} doesn't have an execute() method.`);
	}
}

export async function loadMineflayerEvents(bot: Minecraft): Promise<void> {
	try {
		const events = readdirSync("./dist/events/minecraft");
		for (const eventFile of events) {
			try {
				const eventName = eventFile.split(".")[0];
				const eventStruct = await import(`../events/minecraft/${eventName}.js`);
				const event = new eventStruct.default() as MineflayerEvent;

				if (!event) {
					bot.client.logger.warn(`Failed to load event: ${eventName} - Event is undefined`);
					continue;
				}

				if (event.once) {
					bot.bot.once(event.name, (...p: any) => event.execute(bot, ...p));
				} else {
					bot.bot.on(event.name, (...p: any) => event.execute(bot, ...p));
				}

				bot.client.logger.info(`Loaded Minecraft event: ${event.name} (${eventFile})`);
			} catch (error) {
				bot.client.logger.error(`Error loading Minecraft event ${eventFile}: ${error}`);
			}
		}
	} catch (error) {
		bot.client.logger.error(`Error reading Minecraft events directory: ${error}`);
	}
}