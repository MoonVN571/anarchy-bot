import { ButtonInteraction } from "discord.js";
import { Discord } from "../structures";
import {
	handleDeathResolvePvp,
	handleDeathResolveMob,
	handleDeathApprove,
	handleDeathEditModal,
	handleDeathDismiss,
} from "./buttons/deathVerification";
import {
	handleClassifySystem,
	handleClassifyDeathModal,
	handleClassifyDismiss,
} from "./buttons/messageClassifier";

type ButtonHandler = (client: Discord, interaction: ButtonInteraction) => Promise<void>;

const buttonPrefixHandlers: Array<{ prefix: string; handler: ButtonHandler }> = [
	// Death Verification Buttons
	{ prefix: "death_resolve_pvp_", handler: handleDeathResolvePvp },
	{ prefix: "death_resolve_mob_", handler: handleDeathResolveMob },
	{ prefix: "death_approve_", handler: handleDeathApprove },
	{ prefix: "death_edit_", handler: handleDeathEditModal },
	{ prefix: "death_dismiss_", handler: handleDeathDismiss },

	// Message Classification Buttons
	{ prefix: "classify_system_", handler: handleClassifySystem },
	{ prefix: "classify_death_", handler: handleClassifyDeathModal },
	{ prefix: "classify_dismiss_", handler: handleClassifyDismiss },
];

export async function handleButtonInteraction(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const customId = interaction.customId;

	for (const { prefix, handler } of buttonPrefixHandlers) {
		if (customId.startsWith(prefix)) {
			await handler(client, interaction);
			return;
		}
	}

	client.logger.warn(`No button handler registered for customId: ${customId}`);
}
