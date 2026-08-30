import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";
import { DeathCause } from "../../../database/models/DeathModel";
import { RedisManager } from "../../../redis/RedisManager";

export async function handleDeathResolvePvp(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_resolve_pvp_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này.", flags: MessageFlags.Ephemeral });
			return;
		}

		pattern.cause = DeathCause.PVP;
		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await RedisManager.invalidateDeathPatterns(pattern.serverScope);

		const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
			.setColor(0x2ea711)
			.setTitle("Đã Xác Nhận: Là PvP (Người Chơi)")
			.setFooter({ text: `Xác nhận PvP bởi @${interaction.user.username}` });

		await interaction.editReply({
			embeds: [updatedEmbed],
			components: [],
		});

		client.logger.info(`[DeathVerification] Resolved conflict as PvP for pattern "${pattern.name}" by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error resolving PvP conflict: ${err}`);
	}
}
