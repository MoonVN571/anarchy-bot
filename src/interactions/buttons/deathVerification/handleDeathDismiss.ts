import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";

export async function handleDeathDismiss(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_dismiss_", "");
	await interaction.deferUpdate();

	try {
		await DeathPatternModel.findByIdAndUpdate(patternId, {
			enabled: false,
			confirmedBy: `dismissed_by_${interaction.user.username}`,
		});

		const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
			.setColor(0x808080)
			.setTitle("Death Message Đã Bị Bỏ Qua")
			.setFooter({ text: `Đã bỏ qua bởi @${interaction.user.username}` });

		await interaction.editReply({
			embeds: [updatedEmbed],
			components: [],
		});

		client.logger.info(`[DeathVerification] Pattern ID ${patternId} dismissed by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error dismissing pattern: ${err}`);
	}
}
