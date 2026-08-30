import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";
import { RedisManager } from "../../../redis/RedisManager";

export async function handleDeathApprove(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_approve_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
			return;
		}

		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await RedisManager.invalidateDeathPatterns(pattern.serverScope);

		const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
			.setColor(0x2ea711)
			.setTitle("Death Message Đã Được Xác Minh")
			.setFooter({ text: `Đã duyệt bởi @${interaction.user.username} (${interaction.user.id})` });

		await interaction.editReply({
			embeds: [updatedEmbed],
			components: [],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" approved by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error approving pattern: ${err}`);
	}
}
