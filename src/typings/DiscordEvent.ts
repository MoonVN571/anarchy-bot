import { Client, Events } from 'discord.js';
import { Discord } from '../structures';
import { readdirSync } from 'fs';

export interface DiscordEventExecute {
    (client: Client, ...args: any[]): void | Promise<void>;
}

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

    execute(client: Discord, ...args: any[]): void | Promise<void> {
        throw new Error(`Event ${this.name} doesn't have an execute() method.`);
    }
}

export async function loadDiscordEvents(client: Discord): Promise<void> {
    const eventFiles = readdirSync(`./dist/events/client`).filter((file) => file.endsWith('.ts'));

    const events: DiscordEvent[] = await Promise.all(eventFiles.map(async (file) => {
        const EventClass = (await import(`../events/client/${file}`)).default;
        const event = new EventClass();

        return event;
    }));

    for (const event of events) {
        if (event.once) {
            client.once(typeof event.name, (...args) => event.execute(client, ...args));
        } else {
            client.on(typeof event.name, (...args) => event.execute(client, ...args));
        }
        console.log(`Loaded Discord event: ${event.name}`);
    }
}
