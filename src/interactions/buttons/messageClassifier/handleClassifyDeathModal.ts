import {
	ButtonInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";
import { LabelBuilder } from "@discordjs/builders";
import { Discord } from "../../../structures";
import { escapeRegex } from "../../../utils/regexUtils";

export async function handleClassifyDeathModal(client: Discord, interaction: ButtonInteraction): Promise<void> {
	try {
		let rawMsg = "";
		let serverScope = "global";

		// 1. Extract from Message Components (Components V2 Container)
		const fullText = JSON.stringify(interaction.message.components || []);
		const msgMatch = fullText.match(/```(?:regex)?\n?([\s\S]*?)```/);
		if (msgMatch) {
			rawMsg = msgMatch[1].trim();
		}

		const serverMatch = fullText.match(/Máy chủ:[^\`]*\`([^\`]+)\`/i);
		if (serverMatch) {
			serverScope = serverMatch[1].trim();
		}

		// 2. Fallback to Embeds if present
		if (!rawMsg && interaction.message.embeds?.[0]) {
			const embed = interaction.message.embeds[0];
			const rawMsgField = embed.fields?.find(
				f => f.name.includes("Noi dung tin nhan") || f.name.includes("Nội dung tin nhắn") || f.name.includes("Message Content")
			);
			if (rawMsgField) {
				rawMsg = rawMsgField.value.replace(/```/g, "").trim();
			}

			const serverField = embed.fields?.find(
				f => f.name.includes("May chu") || f.name.includes("Máy chủ") || f.name.includes("Server")
			);
			if (serverField) {
				serverScope = serverField.value.replace(/`/g, "").trim();
			}
		}

		const promptId = interaction.customId.replace("classify_death_", "");
		const modal = new ModalBuilder()
			.setCustomId(`classify_death_modal_${promptId}`)
			.setTitle("Tạo Death Regex Mới");

		let defaultRegex = escapeRegex(rawMsg);
		defaultRegex = `^${defaultRegex}$`;

		const regexLabel = new LabelBuilder()
			.setLabel("Cụm biểu thức Regex")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "death_regex",
					style: TextInputStyle.Paragraph,
					value: defaultRegex,
					placeholder: "VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) đã chết$",
					required: true,
				})
			);

		const victimLabel = new LabelBuilder()
			.setLabel("Nạn nhân (Victim)")
			.setDescription("Tên người chơi bị chết")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "death_victim",
					style: TextInputStyle.Short,
					placeholder: "Tên người chơi bị chết",
					required: false,
				})
			);

		const killerLabel = new LabelBuilder()
			.setLabel("Kẻ hạ gục (Killer) hoặc Quái vật")
			.setDescription("Tên kẻ giết hoặc quái vật")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "death_killer",
					style: TextInputStyle.Short,
					placeholder: "Tên kẻ giết hoặc quái vật",
					required: false,
				})
			);

		const causeLabel = new LabelBuilder()
			.setLabel("Nguyên nhân tử vong (Death Cause)")
			.setDescription("Chọn nguyên nhân phù hợp hoặc để UNKNOWN")
			.setStringSelectMenuComponent(
				new StringSelectMenuBuilder()
					.setCustomId("death_cause")
					.setPlaceholder("Chọn nguyên nhân tử vong (mặc định UNKNOWN)...")
					.setMinValues(1)
					.setMaxValues(1)
					.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel("UNKNOWN (Chưa xác định / Khác)")
							.setValue("UNKNOWN")
							.setDescription("Nguyên nhân chưa rõ")
							.setDefault(true),
						new StringSelectMenuOptionBuilder()
							.setLabel("PVP (Player vs Player)")
							.setValue("PVP")
							.setDescription("Người chơi tiêu diệt lẫn nhau"),
						new StringSelectMenuOptionBuilder()
							.setLabel("MOB (Quái vật)")
							.setValue("MOB")
							.setDescription("Bị quái vật hạ gục"),
						new StringSelectMenuOptionBuilder()
							.setLabel("FALL (Rơi ngã)")
							.setValue("FALL")
							.setDescription("Rơi từ trên cao xuống đất"),
						new StringSelectMenuOptionBuilder()
							.setLabel("VOID (Hư vô)")
							.setValue("VOID")
							.setDescription("Rơi vào khoảng trống không gian"),
						new StringSelectMenuOptionBuilder()
							.setLabel("EXPLOSION (Cháy nổ)")
							.setValue("EXPLOSION")
							.setDescription("Nổ TNT, Crystal, Creeper"),
						new StringSelectMenuOptionBuilder()
							.setLabel("FIRE (Lửa / Dung nham)")
							.setValue("FIRE")
							.setDescription("Chết cháy hoặc rơi vào dung nham"),
						new StringSelectMenuOptionBuilder()
							.setLabel("DROWN (Chết đuối)")
							.setValue("DROWN")
							.setDescription("Ngạt nước dưới nước"),
						new StringSelectMenuOptionBuilder()
							.setLabel("MAGIC (Phép thuật / Độc)")
							.setValue("MAGIC")
							.setDescription("Thuốc độc, Wither effect, phép"),
						new StringSelectMenuOptionBuilder()
							.setLabel("SUICIDE (Tự sát)")
							.setValue("SUICIDE")
							.setDescription("Tự tử hoặc dùng lệnh kill")
					)
			);

		const scopeLabel = new LabelBuilder()
			.setLabel("Server Scope (global / IP)")
			.setTextInputComponent(
				new TextInputBuilder({
					customId: "death_scope",
					style: TextInputStyle.Short,
					value: serverScope,
					required: true,
				})
			);

		modal.addLabelComponents(regexLabel, victimLabel, killerLabel, causeLabel, scopeLabel);

		await interaction.showModal(modal);
	} catch (err) {
		client.logger.error(`[MessageClassifier] Error showing death modal: ${err}`);
	}
}
