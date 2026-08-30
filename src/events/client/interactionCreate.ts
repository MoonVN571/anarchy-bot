import { Events, Interaction } from "discord.js";
import { Discord } from "../../structures";
import { DiscordEvent } from "../../typings/DiscordEvent";
import { handleInteraction } from "../../interactions";

export default class InteractionCreateEvent extends DiscordEvent {
	constructor() {
		super({
			name: Events.InteractionCreate,
			once: false,
		});
	}

	public async execute(client: Discord, interaction: Interaction): Promise<void> {
		await handleInteraction(client, interaction);
	}
}
