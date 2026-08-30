import { ModalSubmitInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Discord } from "../../structures";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { DeathCause } from "../../database/models/DeathModel";
import { RedisManager } from "../../redis/RedisManager";
import { DeathParserService } from "../../services/DeathParserService";

export async function handleCreateDeathModal(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
	const newRegex = interaction.fields.getTextInputValue("death_regex").trim();
	const customVictim = interaction.fields.getTextInputValue("death_victim")?.trim();
	const customKillerOrMob = interaction.fields.getTextInputValue("death_killer")?.trim();
	const newCause = interaction.fields.getTextInputValue("death_cause").trim().toUpperCase() as DeathCause;
	const newScope = interaction.fields.getTextInputValue("death_scope").trim();

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		new RegExp(newRegex);

		const patternName = `death_${newScope.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
		const cause = Object.values(DeathCause).includes(newCause) ? newCause : DeathCause.UNKNOWN;

		const created = await DeathPatternModel.create({
			serverScope: newScope || "global",
			name: patternName,
			pattern: newRegex,
			cause,
			priority: 50,
			enabled: true,
			confirmedBy: interaction.user.tag || interaction.user.username,
		});

		await RedisManager.invalidateDeathPatterns(newScope);

		// Retroactively update/record death if victim provided
		if (customVictim) {
			await DeathParserService.retroactivelyFixDeathStats(
				newScope,
				created.sampleMessage || "",
				customVictim,
				cause === DeathCause.PVP ? customKillerOrMob : null,
				cause === DeathCause.MOB ? customKillerOrMob : null,
				cause
			);
		}

		await interaction.editReply({ content: "Đã lưu Death Regex Pattern mới và cập nhật K/D thành công!" });

		if (interaction.message) {
			const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
				.setColor(0x2ea711)
				.setTitle("Đã Phân Loại Là Tin Nhắn Tử Vong (Death)")
				.addFields(
					{ name: "Nguyên nhân (Cause)", value: `\`${cause}\``, inline: true },
					...(customVictim ? [{ name: "Nạn nhân", value: `\`${customVictim}\``, inline: true }] : []),
					...(customKillerOrMob ? [{ name: "Kẻ hạ gục / Mob", value: `\`${customKillerOrMob}\``, inline: true }] : []),
					{ name: "Death Regex Đã Lưu", value: `\`\`\`regex\n${newRegex}\`\`\`` }
				)
				.setFooter({ text: `Đã duyệt Death bởi @${interaction.user.username}` });

			await interaction.message.edit({
				embeds: [updatedEmbed],
				components: [],
			});
		}

		client.logger.info(`[MessageClassifier] Created death pattern "${newRegex}" by ${interaction.user.tag}`);
	} catch (err: any) {
		await interaction.editReply({ content: `Regex không hợp lệ: ${err.message}` });
	}
}
