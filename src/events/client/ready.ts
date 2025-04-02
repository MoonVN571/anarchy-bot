import { Events } from "discord.js";
import { Discord } from "../../structures";
import { DiscordEvent } from "../../typings/DiscordEvent";

export default class ReadyEvent extends DiscordEvent {
	constructor() {
		super({
			name: Events.ClientReady,
		});
	}

	execute(client: Discord) {
		client.logger.info(`Logged in as ${client.user!.tag}`);
	}
}
	