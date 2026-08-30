import { Interaction } from "discord.js";
import { Discord } from "../structures";
import { handleButtonInteraction } from "./buttonRouter";
import { handleModalInteraction } from "./modalRouter";
import { handleSelectMenuInteraction } from "./selectMenuRouter";

export * from "./buttonRouter";
export * from "./modalRouter";
export * from "./selectMenuRouter";
export * from "./buttons/deathVerification";
export * from "./buttons/messageClassifier";
export * from "./modals";
export * from "./selectMenus";

export async function handleInteraction(client: Discord, interaction: Interaction): Promise<void> {
	if (interaction.isButton()) {
		await handleButtonInteraction(client, interaction);
	} else if (interaction.isModalSubmit()) {
		await handleModalInteraction(client, interaction);
	} else if (interaction.isStringSelectMenu()) {
		await handleSelectMenuInteraction(client, interaction);
	}
}
