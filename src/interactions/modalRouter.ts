import { ModalSubmitInteraction } from "discord.js";
import { Discord } from "../structures";
import { handleEditDeathModal, handleCreateDeathModal } from "./modals";

type ModalHandler = (client: Discord, interaction: ModalSubmitInteraction) => Promise<void>;

const modalPrefixHandlers: Array<{ prefix: string; handler: ModalHandler }> = [
	{ prefix: "death_modal_", handler: handleEditDeathModal },
	{ prefix: "classify_death_modal_", handler: handleCreateDeathModal },
];

export async function handleModalInteraction(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
	const customId = interaction.customId;

	for (const { prefix, handler } of modalPrefixHandlers) {
		if (customId.startsWith(prefix)) {
			await handler(client, interaction);
			return;
		}
	}

	client.logger.warn(`No modal handler registered for customId: ${customId}`);
}
