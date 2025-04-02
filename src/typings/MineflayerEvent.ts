import { BotEvents } from 'mineflayer';
import { Minecraft } from '../structures';

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