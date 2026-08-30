import {
	ButtonInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
} from "discord.js";
import { Discord } from "../../../structures";
import { SystemPatternModel } from "../../../database/models/SystemPatternModel";
import { SystemPatternService } from "../../../services/SystemPatternService";
import { escapeRegex } from "../../../utils/regexUtils";

export async function handleClassifySystem(client: Discord, interaction: ButtonInteraction): Promise<void> {
	await interaction.deferUpdate();

	try {
		const message = interaction.message;
		const rawContent = message.content || "";

		// Extract raw message from message components or content
		let rawMsg = "";
		let serverScope = "global";

		// Parse from message text components if available
		const fullText = JSON.stringify(message.components || []);
		const msgMatch = fullText.match(/```(?:regex)?\n?([\s\S]*?)```/);
		if (msgMatch) {
			rawMsg = msgMatch[1].trim();
		}

		if (!rawMsg) {
			rawMsg = rawContent.trim();
		}

		if (!rawMsg) {
			await interaction.followUp({
				content: "Không thể trích xuất tin nhắn gốc từ Component.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Auto-generate system regex pattern
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

		const container = new ContainerBuilder()
			.setAccentColor(0x3498db)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Đã Phân Loại Là Tin Nhắn Hệ Thống (System)**\n\n` +
					`- **System Regex Đã Lưu:** \`\`\`regex\n${pattern}\`\`\`\n` +
					`- **Tin nhắn mẫu:** \`\`\`${rawMsg}\`\`\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`*Đã duyệt System bởi @${interaction.user.username}*`)
			);

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[MessageClassifier] Saved system pattern for "${rawMsg}" by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[MessageClassifier] Error saving system pattern: ${err}`);
	}
}
