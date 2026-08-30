import {
	ButtonInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} from "discord.js";
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

		const regexInput = new TextInputBuilder()
			.setCustomId("death_regex")
			.setLabel("Cụm biểu thức Regex")
			.setStyle(TextInputStyle.Paragraph)
			.setValue(defaultRegex)
			.setPlaceholder("VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) đã chết$")
			.setRequired(true);

		const victimInput = new TextInputBuilder()
			.setCustomId("death_victim")
			.setLabel("Nạn nhân (Victim)")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("Tên người chơi bị chết")
			.setRequired(false);

		const killerInput = new TextInputBuilder()
			.setCustomId("death_killer")
			.setLabel("Kẻ hạ gục (Killer) hoặc Quái vật")
			.setStyle(TextInputStyle.Short)
			.setPlaceholder("Tên kẻ giết hoặc quái vật")
			.setRequired(false);

		const causeInput = new TextInputBuilder()
			.setCustomId("death_cause")
			.setLabel("Nguyên nhân (PVP, MOB, FALL, VOID...)")
			.setStyle(TextInputStyle.Short)
			.setValue("PVP")
			.setRequired(true);

		const scopeInput = new TextInputBuilder()
			.setCustomId("death_scope")
			.setLabel("Server Scope (global / IP)")
			.setStyle(TextInputStyle.Short)
			.setValue(serverScope)
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
		client.logger.error(`[MessageClassifier] Error showing death modal: ${err}`);
	}
}
