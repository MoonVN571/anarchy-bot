import {
	ModalSubmitInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
} from "discord.js";
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
	let newCause = DeathCause.UNKNOWN;
	try {
		const selectedCauses = interaction.fields.getStringSelectValues("pattern_cause");
		if (selectedCauses && selectedCauses.length > 0) {
			const val = selectedCauses[0].toUpperCase() as DeathCause;
			if (Object.values(DeathCause).includes(val)) {
				newCause = val;
			}
		}
	} catch {
		try {
			const textCause = interaction.fields.getTextInputValue("pattern_cause")?.trim().toUpperCase();
			if (textCause && Object.values(DeathCause).includes(textCause as DeathCause)) {
				newCause = textCause as DeathCause;
			}
		} catch {
			newCause = DeathCause.UNKNOWN;
		}
	}
	const newScope = interaction.fields.getTextInputValue("pattern_scope")?.trim() || "global";

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
			const container = new ContainerBuilder()
				.setAccentColor(0x2ea711)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Death Message Đã Được Chỉnh Sửa & Xác Minh**\n\n` +
						`- **Server Scope:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`${pattern.cause}\`\n` +
						(customVictim ? `- **Nạn nhân:** \`${customVictim}\`\n` : "") +
						(customKillerOrMob ? `- **Kẻ hạ gục / Mob:** \`${customKillerOrMob}\`\n` : "") +
						`- **Tin nhắn gốc:** \`\`\`${pattern.sampleMessage || "N/A"}\`\`\`\n` +
						`- **Regex Đã Sửa:** \`\`\`regex\n${pattern.pattern}\`\`\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã chỉnh sửa & duyệt bởi @${interaction.user.username}*`)
				);

			await interaction.message.edit({
				components: [container],
			});
		}

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" edited & approved by ${interaction.user.tag}`);
	} catch (err: any) {
		await interaction.editReply({ content: `Regex không hợp lệ: ${err.message}` });
	}
}
