import {
	ButtonInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	MessageFlags,
} from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";

export async function handleDeathEditModal(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_edit_", "");

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.reply({ content: "Không tìm thấy pattern này.", flags: MessageFlags.Ephemeral });
			return;
		}

		const modal = new ModalBuilder()
			.setCustomId(`death_modal_${patternId}`)
			.setTitle("Sửa Regex, Nạn Nhân & Kẻ Hạ Gục");

		const regexInput = new TextInputBuilder()
			.setCustomId("pattern_regex")
			.setLabel("Cụm biểu thức Regex")
			.setStyle(TextInputStyle.Paragraph)
			.setValue(pattern.pattern)
			.setPlaceholder("VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) đã chết$")
			.setRequired(true);

		const victimInput = new TextInputBuilder()
			.setCustomId("pattern_victim")
			.setLabel("Nạn nhân (Victim)")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("Nhập tên nạn nhân trong câu mẫu")
			.setRequired(false);

		const killerInput = new TextInputBuilder()
			.setCustomId("pattern_killer")
			.setLabel("Kẻ hạ gục (Killer) hoặc Quái vật")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("Nhập tên người giết hoặc quái vật")
			.setRequired(false);

		const causeInput = new TextInputBuilder()
			.setCustomId("pattern_cause")
			.setLabel("Nguyên nhân (PVP, MOB, FALL, VOID...)")
			.setStyle(TextInputStyle.Short)
			.setValue(pattern.cause)
			.setRequired(true);

		const scopeInput = new TextInputBuilder()
			.setCustomId("pattern_scope")
			.setLabel("Server Scope (global / IP máy chủ)")
			.setStyle(TextInputStyle.Short)
			.setValue(pattern.serverScope || "global")
			.setRequired(true);

		modal.addComponents(
			new ActionRowBuilder<TextInputBuilder>().addComponents(regexInput),
			new ActionRowBuilder<TextInputBuilder>().addComponents(victimInput),
			new ActionRowBuilder<TextInputBuilder>().addComponents(killerInput),
			new ActionRowBuilder<TextInputBuilder>().addComponents(causeInput),
			new ActionRowBuilder<TextInputBuilder>().addComponents(scopeInput)
		);

		await interaction.showModal(modal);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error showing edit modal: ${err}`);
	}
}
