import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Discord } from "../../../structures";
import { SystemPatternModel } from "../../../database/models/SystemPatternModel";
import { SystemPatternService } from "../../../services/SystemPatternService";
import { escapeRegex } from "../../../utils/regexUtils";

export async function handleClassifySystem(client: Discord, interaction: ButtonInteraction): Promise<void> {
	await interaction.deferUpdate();

	try {
		const embed = interaction.message.embeds[0];
		const rawMsgField = embed.fields.find(
			f => f.name.includes("Noi dung tin nhan") || f.name.includes("Nội dung tin nhắn") || f.name.includes("Message Content")
		);
		const rawMsg = rawMsgField ? rawMsgField.value.replace(/```/g, "").trim() : "";
		const serverField = embed.fields.find(
			f => f.name.includes("May chu") || f.name.includes("Máy chủ") || f.name.includes("Server")
		);
		const serverScope = serverField ? serverField.value.replace(/`/g, "").trim() : "global";

		if (!rawMsg) {
			await interaction.followUp({
				content: "Không thể trích xuất tin nhắn gốc từ Embed.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Auto-generate system regex pattern (escape special characters, replace numbers with \d+)
		let pattern = escapeRegex(rawMsg);
		pattern = pattern.replace(/\\\d+/g, "\\d+");
		pattern = `^${pattern}$`;

		const patternName = `system_${serverScope.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

		await SystemPatternModel.create({
			serverScope,
			name: patternName,
			pattern,
			category: "general",
			priority: 50,
			enabled: true,
			sampleMessage: rawMsg,
			confirmedBy: interaction.user.tag || interaction.user.username,
		});

		await SystemPatternService.invalidateCache(serverScope);

		const updatedEmbed = EmbedBuilder.from(embed)
			.setColor(0x3498db)
			.setTitle("Đã Phân Loại Là Tin Nhắn Hệ Thống (System)")
			.addFields({ name: "System Regex Đã Lưu", value: `\`\`\`regex\n${pattern}\`\`\`` })
			.setFooter({ text: `Đã duyệt System bởi @${interaction.user.username}` });

		await interaction.editReply({
			embeds: [updatedEmbed],
			components: [],
		});

		client.logger.info(`[MessageClassifier] Saved system pattern for "${rawMsg}" by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[MessageClassifier] Error saving system pattern: ${err}`);
	}
}
