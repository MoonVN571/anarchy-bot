import ReadyEvent from "./ready";
import InteractionCreateEvent from "./interactionCreate";
import { DiscordEvent } from "../../typings";
import { Discord } from "../../structures";

export const discordEventClasses: (new () => DiscordEvent)[] = [
	ReadyEvent,
	InteractionCreateEvent,
];

export async function loadDiscordEvents(client: Discord): Promise<void> {
	for (const EventClass of discordEventClasses) {
		try {
			const event = new EventClass();
			if (!event) {
				continue;
			}
			if (event.once) {
				client.once(event.name as any, (...p) => event.execute(client, ...p));
			} else {
				client.on(event.name as any, (...p) => event.execute(client, ...p));
			}
		} catch (error) {
			client.logger.error(`[Discord] Error loading event: ${error}`);
		}
	}
}

export {
	ReadyEvent,
	InteractionCreateEvent,
};
