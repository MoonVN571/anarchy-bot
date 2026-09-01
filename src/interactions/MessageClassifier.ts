import {
	ButtonInteraction,
	ContainerBuilder,
	LabelBuilder,
	MessageFlags,
	ModalBuilder,
	ModalSubmitInteraction,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { SystemPatternModel } from "../database/models/SystemPatternModel";
import { SystemPatternService } from "../services";
import { Discord } from "../structures";
import { escapeRegex } from "../utils";
import { DeathVerificationInteraction } from "./DeathVerification";

export class MessageClassifierInteraction {
	/**
	 * Central interaction handler for Message Classifier domain
	 */
	public static async handle(
		client: Discord,
		interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction
	): Promise<void> {
		const customId = interaction.customId;

		if (interaction.isButton()) {
			if (customId.startsWith("classify_system_")) {
				return this.onClassifySystem(client, interaction);
			}
			if (customId.startsWith("classify_dismiss_")) {
				return this.onClassifyDismiss(client, interaction);
			}
			if (customId.startsWith("classify_death_")) {
				return this.onClassifyDeathModalTrigger(client, interaction);
			}
		} else if (interaction.isModalSubmit()) {
			if (customId.startsWith("classify_death_modal_")) {
				return DeathVerificationInteraction.onSubmitCreateModal(client, interaction);
			}
		}

		client.logger.warn(`[MessageClassifier] No handler found for customId: ${customId}`);
	}

	/**
	 * Button: Classify message as System pattern
	 */
	public static async onClassifySystem(client: Discord, interaction: ButtonInteraction): Promise<void> {
		await interaction.deferUpdate();

		try {
			const message = interaction.message;
			const rawContent = message.content || "";

			let rawMsg = "";
			let serverScope = "global";

			const fullText = JSON.stringify(message.components || []);
			const msgMatch = fullText.match(/```(?:regex)?\n?([\s\S]*?)```/);
			if (msgMatch) {
				rawMsg = msgMatch[1].trim();
			}

			const serverMatch = fullText.match(/Máy chủ:[^\`]*\`([^\`]+)\`/i);
			if (serverMatch) {
				serverScope = serverMatch[1].trim();
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
						`- **Máy chủ:** \`${serverScope}\`\n\n` +
						`**System Regex Đã Lưu:**\n\`regex\n${pattern}\n\`\n` +
						`**Tin nhắn mẫu:**\n\`\`\`\n${rawMsg}\n\`\`\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã duyệt System bởi @${interaction.user.username}*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[MessageClassifier] Saved system pattern for "${rawMsg}" by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[MessageClassifier] Error saving system pattern: ${err}`);
		}
	}

	/**
	 * Button: Dismiss classification prompt
	 */
	public static async onClassifyDismiss(_client: Discord, interaction: ButtonInteraction): Promise<void> {
		await interaction.deferUpdate();

		const container = new ContainerBuilder()
			.setAccentColor(0x808080)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Đã Bỏ Qua Tin Nhắn**\n` +
					`*Đã bỏ qua bởi @${interaction.user.username}*`
				)
			);

		await interaction.editReply({ components: [container] });
	}

	/**
	 * Button: Trigger modal to classify as Death message (with pre-fill)
	 */
	public static async onClassifyDeathModalTrigger(client: Discord, interaction: ButtonInteraction): Promise<void> {
		try {
			let rawMsg = "";
			let serverScope = "global";

			const fullText = JSON.stringify(interaction.message.components || []);
			const msgMatch = fullText.match(/```(?:regex)?\n?([\s\S]*?)```/);
			if (msgMatch) {
				rawMsg = msgMatch[1].trim();
			}

			const serverMatch = fullText.match(/Máy chủ:[^\`]*\`([^\`]+)\`/i);
			if (serverMatch) {
				serverScope = serverMatch[1].trim();
			}

			// Fallback to Embeds if present
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

			// Pre-extract potential detected players from prompt content if present
			let detectedVictim = "";
			const playerMatch = fullText.match(/Phát hiện:[^\`]*\`([^\`]+)\`/i);
			if (playerMatch) {
				detectedVictim = playerMatch[1].trim();
			}

			const promptId = interaction.customId.replace("classify_death_", "");
			const modal = new ModalBuilder()
				.setCustomId(`classify_death_modal_${promptId}`)
				.setTitle("Tạo Death Regex Mới");

			let defaultRegex = escapeRegex(rawMsg);
			if (detectedVictim) {
				defaultRegex = defaultRegex.replace(
					new RegExp(escapeRegex(detectedVictim), "i"),
					"(?<victim>[a-zA-Z0-9_]{3,16})"
				);
			}
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
						value: detectedVictim || "",
						placeholder: detectedVictim ? `VD: ${detectedVictim}` : "Tên người chơi bị chết",
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
								.setDescription("Rơi từ trên cao"),
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
								.setDescription("Ngạt nước"),
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
}
