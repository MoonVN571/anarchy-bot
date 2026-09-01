import { Interaction } from "discord.js";
import { Discord } from "../structures";
import { DeathVerificationInteraction } from "./DeathVerification";
import { MessageClassifierInteraction } from "./MessageClassifier";

export * from "./DeathVerification";
export * from "./MessageClassifier";

export async function handleInteraction(client: Discord, interaction: Interaction): Promise<void> {
	if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) {
		return;
	}

	const customId = interaction.customId;

	// 1. Dispatch Death Verification Interactions
	if (
		customId.startsWith("death_") ||
		customId.startsWith("select_death_") ||
		customId.startsWith("create_death_")
	) {
		await DeathVerificationInteraction.handle(client, interaction);
		return;
	}

	// 2. Dispatch Message Classifier Interactions
	if (customId.startsWith("classify_")) {
		await MessageClassifierInteraction.handle(client, interaction);
		return;
	}

	client.logger.warn(`[Interactions] Unhandled interaction customId: ${customId}`);
}
