import { StringSelectMenuInteraction } from "discord.js";
import { Discord } from "../structures";
import { handleCauseSelectMenu, handleScopeSelectMenu } from "./selectMenus";

type SelectMenuHandler = (client: Discord, interaction: StringSelectMenuInteraction) => Promise<void>;

const selectMenuPrefixHandlers: Array<{ prefix: string; handler: SelectMenuHandler }> = [
	{ prefix: "select_death_cause_", handler: handleCauseSelectMenu },
	{ prefix: "select_death_scope_", handler: handleScopeSelectMenu },
];

export async function handleSelectMenuInteraction(
	client: Discord,
	interaction: StringSelectMenuInteraction
): Promise<void> {
	const customId = interaction.customId;

	for (const { prefix, handler } of selectMenuPrefixHandlers) {
		if (customId.startsWith(prefix)) {
			await handler(client, interaction);
			return;
		}
	}

	client.logger.warn(`No select menu handler registered for customId: ${customId}`);
}
