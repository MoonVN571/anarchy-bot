import { BotEvents } from 'mineflayer';
import { Minecraft } from '../structures';

export interface MineflayerEventExecute {
    (bot: Minecraft, ...args: any[]): void | Promise<void>;
}

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

    execute(bot: Minecraft, ...args: any[]): void | Promise<void> {
        throw new Error(`Event ${this.name} doesn't have an execute() method.`);
    }
}