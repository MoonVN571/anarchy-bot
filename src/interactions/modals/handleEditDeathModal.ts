import { ModalSubmitInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Discord } from "../../structures";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { DeathCause } from "../../database/models/DeathModel";
import { RedisManager } from "../../redis/RedisManager";
import { DeathParserService } from "../../services/DeathParserService";

export async function handleEditDeathModal(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_modal_", "");
	const newRegex = interaction.fields.getTextInputValue("pattern_regex").trim();
	const customVictim = interaction.fields.getTextInputValue("pattern_victim")?.trim();
	const customKillerOrMob = interaction.fields.getTextInputValue("pattern_killer")?.trim();
	const newCause = interaction.fields.getTextInputValue("pattern_cause").trim().toUpperCase() as DeathCause;
	const newScope = interaction.fields.getTextInputValue("pattern_scope").trim();

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		new RegExp(newRegex);

		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.editReply({ content: "Không tìm thấy pattern này." });
			return;
		}

		pattern.pattern = newRegex;
		pattern.cause = Object.values(DeathCause).includes(newCause) ? newCause : DeathCause.UNKNOWN;
		pattern.serverScope = newScope || "global";
		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await RedisManager.invalidateDeathPatterns(pattern.serverScope);

		// Retroactively fix stats if victim/killer was corrected
		if (pattern.sampleMessage && customVictim) {
			await DeathParserService.retroactivelyFixDeathStats(
				pattern.serverScope,
				pattern.sampleMessage,
				customVictim,
				pattern.cause === DeathCause.PVP ? customKillerOrMob : null,
				pattern.cause === DeathCause.MOB ? customKillerOrMob : null,
				pattern.cause
			);
		}

		await interaction.editReply({ content: "Đã lưu và điều chỉnh K/D & Regex Pattern thành công!" });

		if (interaction.message) {
			const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
				.setColor(0x2ea711)
				.setTitle("Death Message Đã Được Chỉnh Sửa & Xác Minh")
				.setFields(
					{ name: "Server Scope", value: `\`${pattern.serverScope}\``, inline: true },
					{ name: "Nguyên nhân (Cause)", value: `\`${pattern.cause}\``, inline: true },
					...(customVictim ? [{ name: "Nạn nhân (Victim)", value: `\`${customVictim}\``, inline: true }] : []),
					...(customKillerOrMob ? [{ name: "Kẻ hạ gục / Mob", value: `\`${customKillerOrMob}\``, inline: true }] : []),
					{ name: "Tin nhắn gốc", value: `\`\`\`${pattern.sampleMessage || "N/A"}\`\`\`` },
					{ name: "Regex Đã Sửa", value: `\`\`\`regex\n${pattern.pattern}\`\`\`` }
				)
				.setFooter({ text: `Đã chỉnh sửa & duyệt bởi @${interaction.user.username}` });

			await interaction.message.edit({
				embeds: [updatedEmbed],
				components: [],
			});
		}

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" edited & approved by ${interaction.user.tag}`);
	} catch (err: any) {
		await interaction.editReply({ content: `Regex không hợp lệ: ${err.message}` });
	}
}
