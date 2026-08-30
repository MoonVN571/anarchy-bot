import {
	ButtonInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	MessageFlags,
} from "discord.js";
import { LabelBuilder } from "@discordjs/builders";
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

		let extractedVictim = "";
		let extractedKiller = "";

		if (pattern.sampleMessage) {
			try {
				const regex = new RegExp(pattern.pattern);
				const match = pattern.sampleMessage.match(regex);
				if (match?.groups) {
					extractedVictim = match.groups.victim || "";
					extractedKiller = match.groups.killer || match.groups.mob || "";
				}
			} catch {
				// Ignore if pattern is invalid regex
			}
		}

		const modal = new ModalBuilder()
			.setCustomId(`death_modal_${patternId}`)
			.setTitle("Sửa Regex, Nạn Nhân & Kẻ Hạ Gục");

		const regexLabel = new LabelBuilder()
			.setLabel("Cụm biểu thức Regex")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "pattern_regex",
					style: TextInputStyle.Paragraph,
					value: pattern.pattern,
					placeholder: "VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) đã bị (?<killer>[a-zA-Z0-9_]{3,16}) giết$",
					required: true,
				})
			);

		const victimLabel = new LabelBuilder()
			.setLabel("Nạn nhân (Victim)")
			.setDescription("Để trống nếu regex đã có group victim")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "pattern_victim",
					style: TextInputStyle.Short,
					placeholder: extractedVictim ? `VD: ${extractedVictim}` : "VD: Steve",
					required: false,
				})
			);

		const killerLabel = new LabelBuilder()
			.setLabel("Kẻ hạ gục (Killer) hoặc Quái vật")
			.setDescription("Để trống nếu regex đã có group killer/mob")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "pattern_killer",
					style: TextInputStyle.Short,
					placeholder: extractedKiller ? `VD: ${extractedKiller}` : "VD: Alex / Zombie",
					required: false,
				})
			);

		const causeLabel = new LabelBuilder()
			.setLabel("Nguyên nhân tử vong (Death Cause)")
			.setDescription("Chọn nguyên nhân tử vong hoặc để UNKNOWN")
			.setStringSelectMenuComponent(
				new StringSelectMenuBuilder()
					.setCustomId("pattern_cause")
					.setPlaceholder("Chọn nguyên nhân tử vong (mặc định UNKNOWN)...")
					.setMinValues(0)
					.setMaxValues(1)
					.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel("UNKNOWN (Chưa xác định / Khác)")
							.setValue("UNKNOWN")
							.setDescription("Nguyên nhân chưa rõ hoặc khác")
							.setDefault(pattern.cause === "UNKNOWN" || !pattern.cause),
						new StringSelectMenuOptionBuilder()
							.setLabel("PVP (Player vs Player)")
							.setValue("PVP")
							.setDescription("Người chơi tiêu diệt lẫn nhau")
							.setDefault(pattern.cause === "PVP"),
						new StringSelectMenuOptionBuilder()
							.setLabel("MOB (Quái vật)")
							.setValue("MOB")
							.setDescription("Bị quái vật hạ gục")
							.setDefault(pattern.cause === "MOB"),
						new StringSelectMenuOptionBuilder()
							.setLabel("FALL (Rơi ngã)")
							.setValue("FALL")
							.setDescription("Rơi từ trên cao xuống đất")
							.setDefault(pattern.cause === "FALL"),
						new StringSelectMenuOptionBuilder()
							.setLabel("VOID (Hư vô)")
							.setValue("VOID")
							.setDescription("Rơi vào khoảng trống không gian")
							.setDefault(pattern.cause === "VOID"),
						new StringSelectMenuOptionBuilder()
							.setLabel("EXPLOSION (Cháy nổ)")
							.setValue("EXPLOSION")
							.setDescription("Nổ TNT, Crystal, Creeper")
							.setDefault(pattern.cause === "EXPLOSION"),
						new StringSelectMenuOptionBuilder()
							.setLabel("FIRE (Lửa / Dung nham)")
							.setValue("FIRE")
							.setDescription("Chết cháy hoặc rơi vào dung nham")
							.setDefault(pattern.cause === "FIRE"),
						new StringSelectMenuOptionBuilder()
							.setLabel("DROWN (Chết đuối)")
							.setValue("DROWN")
							.setDescription("Ngạt nước dưới nước")
							.setDefault(pattern.cause === "DROWN"),
						new StringSelectMenuOptionBuilder()
							.setLabel("MAGIC (Phép thuật / Độc)")
							.setValue("MAGIC")
							.setDescription("Thuốc độc, Wither effect, phép")
							.setDefault(pattern.cause === "MAGIC"),
						new StringSelectMenuOptionBuilder()
							.setLabel("SUICIDE (Tự sát)")
							.setValue("SUICIDE")
							.setDescription("Tự tử hoặc dùng lệnh kill")
							.setDefault(pattern.cause === "SUICIDE")
					)
			);

		const scopeLabel = new LabelBuilder()
			.setLabel("Server Scope (global / IP máy chủ)")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "pattern_scope",
					style: TextInputStyle.Short,
					value: pattern.serverScope || "global",
					placeholder: "VD: global hoặc 2y2c.org, anarchyvn.net",
					required: true,
				})
			);

		modal.addLabelComponents(regexLabel, victimLabel, killerLabel, causeLabel, scopeLabel);

		await interaction.showModal(modal);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error showing edit modal: ${err}`);
	}
}
