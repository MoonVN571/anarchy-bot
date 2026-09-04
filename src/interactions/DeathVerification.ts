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
import { DeathCause } from "../database/models/DeathModel";
import { DeathPatternModel } from "../database/models/DeathPatternModel";
import { RedisManager } from "../redis/RedisManager";
import { DeathParserService } from "../services";
import { Discord } from "../structures";

export class DeathVerificationInteraction {
	/**
	 * Central interaction handler for Death Verification domain
	 */
	public static async handle(
		client: Discord,
		interaction: ButtonInteraction | ModalSubmitInteraction | StringSelectMenuInteraction
	): Promise<void> {
		const customId = interaction.customId;

		if (interaction.isButton()) {
			if (customId.startsWith("death_approve_")) {
				return this.onApprove(client, interaction);
			}
			if (customId.startsWith("death_dismiss_")) {
				return this.onDismiss(client, interaction);
			}
			if (customId.startsWith("death_resolve_mob_")) {
				return this.onResolveMob(client, interaction);
			}
			if (customId.startsWith("death_resolve_pvp_")) {
				return this.onResolvePvp(client, interaction);
			}
			if (customId.startsWith("death_swap_")) {
				return this.onSwap(client, interaction);
			}
			if (customId.startsWith("death_edit_")) {
				return this.onEditModalTrigger(client, interaction);
			}
		} else if (interaction.isModalSubmit()) {
			if (customId.startsWith("death_modal_")) {
				return this.onSubmitEditModal(client, interaction);
			}
			if (customId.startsWith("create_death_modal_") || customId.startsWith("death_create_modal_")) {
				return this.onSubmitCreateModal(client, interaction);
			}
		} else if (interaction.isStringSelectMenu()) {
			if (customId.startsWith("select_death_cause_")) {
				return this.onSelectCause(client, interaction);
			}
			if (customId.startsWith("select_death_scope_")) {
				return this.onSelectScope(client, interaction);
			}
		}

		client.logger.warn(`[DeathVerification] No handler found for customId: ${customId}`);
	}

	/**
	 * Button: Approve death pattern
	 */
	public static async onApprove(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_approve_", "");
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

			const container = new ContainerBuilder()
				.setAccentColor(0x2ea711)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Death Message Đã Được Xác Minh**\n\n` +
						`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`${pattern.cause}\`\n\n` +
						`**Regex:**\n\`x\n${pattern.pattern}\n\`\n` +
						`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã duyệt bởi @${interaction.user.username} (${interaction.user.id})*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" approved by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error approving pattern: ${err}`);
		}
	}

	/**
	 * Button: Dismiss death pattern
	 */
	public static async onDismiss(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_dismiss_", "");
		await interaction.deferUpdate();

		try {
			await DeathPatternModel.findByIdAndUpdate(patternId, {
				enabled: false,
				confirmedBy: `dismissed_by_${interaction.user.username}`,
			});

			const container = new ContainerBuilder()
				.setAccentColor(0x808080)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Death Message Đã Bị Bỏ Qua**\n` +
						`*Đã bỏ qua bởi @${interaction.user.username}*`
					)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern ID ${patternId} dismissed by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error dismissing pattern: ${err}`);
		}
	}

	/**
	 * Button: Resolve conflict as Mob
	 */
	public static async onResolveMob(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_resolve_mob_", "");
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			pattern.cause = DeathCause.DEATH;
			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

			const container = new ContainerBuilder()
				.setAccentColor(0x3498db)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Đã Xác Nhận Là Tử Vong (Death)**\n\n` +
						`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`DEATH\`\n\n` +
						`**Regex:**\n\`x\n${pattern.pattern}\n\`\n` +
						`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã duyệt bởi @${interaction.user.username}*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" resolved as MOB by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error resolving Mob pattern: ${err}`);
		}
	}

	/**
	 * Button: Resolve conflict as PvP
	 */
	public static async onResolvePvp(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_resolve_pvp_", "");
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			pattern.cause = DeathCause.PVP;
			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

			const container = new ContainerBuilder()
				.setAccentColor(0x2ea711)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Đã Xác Nhận Là PvP (Player vs Player)**\n\n` +
						`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`PVP\`\n\n` +
						`**Regex:**\n\`x\n${pattern.pattern}\n\`\n` +
						`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã duyệt bởi @${interaction.user.username}*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" resolved as PVP by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error resolving PvP pattern: ${err}`);
		}
	}

	/**
	 * Button: Swap victim and killer in pattern
	 */
	public static async onSwap(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_swap_", "");
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			let newPatternRegex = pattern.pattern;
			if (newPatternRegex.includes("(?<victim>") && newPatternRegex.includes("(?<killer>")) {
				newPatternRegex = newPatternRegex.replace("(?<victim>[a-zA-Z0-9_]{3,16})", "__TEMP_SWAP__");
				newPatternRegex = newPatternRegex.replace("(?<killer>[a-zA-Z0-9_]{3,16})", "(?<victim>[a-zA-Z0-9_]{3,16})");
				newPatternRegex = newPatternRegex.replace("__TEMP_SWAP__", "(?<killer>[a-zA-Z0-9_]{3,16})");
			} else if (newPatternRegex.includes("(?<victim>") && newPatternRegex.includes("(?<mob>")) {
				newPatternRegex = newPatternRegex.replace("(?<victim>[a-zA-Z0-9_]{3,16})", "__TEMP_SWAP__");
				newPatternRegex = newPatternRegex.replace("(?<mob>.+?)", "(?<victim>[a-zA-Z0-9_]{3,16})");
				newPatternRegex = newPatternRegex.replace("__TEMP_SWAP__", "(?<killer>[a-zA-Z0-9_]{3,16})");
			}

			pattern.pattern = newPatternRegex;
			pattern.cause = DeathCause.PVP;
			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			let swappedVictim = "N/A";
			let swappedKiller = "N/A";
			if (pattern.sampleMessage) {
				const m = pattern.sampleMessage.match(new RegExp(pattern.pattern, "i"));
				if (m && m.groups) {
					swappedVictim = m.groups.victim || "N/A";
					swappedKiller = m.groups.killer || "N/A";
				}
			}

			await DeathParserService.onPatternApproved(
				client,
				pattern,
				interaction.user.username,
				swappedVictim !== "N/A" ? swappedVictim : null,
				swappedKiller !== "N/A" ? swappedKiller : null
			);

			const container = new ContainerBuilder()
				.setAccentColor(0x2ea711)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Death Message Đã Được Đổi Vị Trí & Xác Minh Thành Công**\n\n` +
						`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`PVP\`\n` +
						`- **Nạn nhân mới (Victim):** \`${swappedVictim}\`\n` +
						`- **Kẻ hạ gục mới (Killer):** \`${swappedKiller}\`\n\n` +
						`**Regex Mới:**\n\`x\n${pattern.pattern}\n\`\n` +
						`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã đổi vị trí & duyệt bởi @${interaction.user.username} (${interaction.user.id})*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" swapped (Victim: ${swappedVictim}, Killer: ${swappedKiller}) and approved by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error swapping pattern: ${err}`);
		}
	}

	/**
	 * Button: Trigger modal to edit pattern
	 */
	public static async onEditModalTrigger(client: Discord, interaction: ButtonInteraction): Promise<void> {
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
					// Ignore invalid regex
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
						value: extractedVictim || "",
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
						value: extractedKiller || "",
						placeholder: extractedKiller ? `VD: ${extractedKiller}` : "VD: Alex / Zombie",
						required: false,
					})
				);

			const causeLabel = new LabelBuilder()
				.setLabel("Nguyên nhân tử vong (Death Cause)")
				.setDescription("Chọn nguyên nhân tử vong (mặc định: DEATH)")
				.setStringSelectMenuComponent(
					new StringSelectMenuBuilder()
						.setCustomId("pattern_cause")
						.setPlaceholder("Chọn nguyên nhân tử vong (mặc định: DEATH)...")
						.setMinValues(1)
						.setMaxValues(1)
						.addOptions(
							new StringSelectMenuOptionBuilder()
								.setLabel("DEATH (Tử vong thường / Môi trường / Quái vật)")
								.setValue("DEATH")
								.setDescription("Chết do quái vật, rơi ngã, nổ crystal, dung nham, tự sát")
								.setDefault(pattern.cause === DeathCause.DEATH || !pattern.cause),
							new StringSelectMenuOptionBuilder()
								.setLabel("PVP (Player vs Player)")
								.setValue("PVP")
								.setDescription("Người chơi tiêu diệt lẫn nhau để tính K/D")
								.setDefault(pattern.cause === DeathCause.PVP),
							new StringSelectMenuOptionBuilder()
								.setLabel("UNKNOWN (Chưa xác định / Khác)")
								.setValue("UNKNOWN")
								.setDescription("Nguyên nhân chưa rõ, vẫn tính 1 lần tử vong")
								.setDefault(pattern.cause === DeathCause.UNKNOWN)
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

	/**
	 * Modal Submit: Edit existing death pattern
	 */
	public static async onSubmitEditModal(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
		const patternId = interaction.customId.replace("death_modal_", "");
		const newRegex = interaction.fields.getTextInputValue("pattern_regex").trim();
		const customVictim = interaction.fields.getTextInputValue("pattern_victim")?.trim();
		const customKillerOrMob = interaction.fields.getTextInputValue("pattern_killer")?.trim();
		let newCause = DeathCause.DEATH;

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
				newCause = DeathCause.DEATH;
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
			pattern.cause = Object.values(DeathCause).includes(newCause) ? newCause : DeathCause.DEATH;
			pattern.serverScope = newScope || "global";
			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await DeathParserService.onPatternApproved(
				client,
				pattern,
				interaction.user.username,
				customVictim || null,
				customKillerOrMob || null
			);

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
							`\n**Regex Đã Sửa:**\`\n${pattern.pattern}\n\`` +
							`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
						)
					)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`*Đã chỉnh sửa & duyệt bởi @${interaction.user.username}*`)
					);

				await interaction.message.edit({ components: [container] });
			}

			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" edited & approved by ${interaction.user.tag}`);
		} catch (err: any) {
			await interaction.editReply({ content: `Regex không hợp lệ: ${err.message}` });
		}
	}

	/**
	 * Modal Submit: Create new death pattern
	 */
	public static async onSubmitCreateModal(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
		const newRegex = interaction.fields.getTextInputValue("death_regex").trim();
		const customVictim = interaction.fields.getTextInputValue("death_victim")?.trim();
		const customKillerOrMob = interaction.fields.getTextInputValue("death_killer")?.trim();
		let newCause = DeathCause.DEATH;

		try {
			const selectedCauses = interaction.fields.getStringSelectValues("death_cause");
			if (selectedCauses && selectedCauses.length > 0) {
				const val = selectedCauses[0].toUpperCase() as DeathCause;
				if (Object.values(DeathCause).includes(val)) {
					newCause = val;
				}
			}
		} catch {
			try {
				const textCause = interaction.fields.getTextInputValue("death_cause")?.trim().toUpperCase();
				if (textCause && Object.values(DeathCause).includes(textCause as DeathCause)) {
					newCause = textCause as DeathCause;
				}
			} catch {
				newCause = DeathCause.DEATH;
			}
		}

		const newScope = interaction.fields.getTextInputValue("death_scope")?.trim() || "global";
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			new RegExp(newRegex);

			const patternName = `death_${newScope.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
			const cause = newCause;

			const created = await DeathPatternModel.create({
				serverScope: newScope || "global",
				name: patternName,
				pattern: newRegex,
				cause,
				priority: 50,
				enabled: true,
				confirmedBy: interaction.user.tag || interaction.user.username,
			});

			await DeathParserService.onPatternApproved(
				client,
				created,
				interaction.user.username,
				customVictim || null,
				customKillerOrMob || null
			);

			await interaction.editReply({ content: "Đã lưu Death Regex Pattern mới và cập nhật K/D thành công!" });

			if (interaction.message) {
				const container = new ContainerBuilder()
					.setAccentColor(0x2ea711)
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`**Đã Phân Loại Là Tin Nhắn Tử Vong (Death)**\n\n` +
							`- **Nguyên nhân (Cause):** \`${cause}\`\n` +
							(customVictim ? `- **Nạn nhân:** \`${customVictim}\`\n` : "") +
							(customKillerOrMob ? `- **Kẻ hạ gục / Mob:** \`${customKillerOrMob}\`\n` : "") +
							`\n**Death Regex Đã Lưu:**\n\`regex\n${newRegex}\n\``
						)
					)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(`*Đã duyệt Death bởi @${interaction.user.username}*`)
					);

				await interaction.message.edit({ components: [container] });
			}

			client.logger.info(`[DeathVerification] Created death pattern "${newRegex}" by ${interaction.user.tag}`);
		} catch (err: any) {
			await interaction.editReply({ content: `Regex không hợp lệ: ${err.message}` });
		}
	}

	/**
	 * Select Menu: Select cause for pattern
	 */
	public static async onSelectCause(client: Discord, interaction: StringSelectMenuInteraction): Promise<void> {
		const patternId = interaction.customId.replace("select_death_cause_", "");
		const selectedCause = interaction.values[0] as DeathCause;
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			pattern.cause = Object.values(DeathCause).includes(selectedCause) ? selectedCause : DeathCause.DEATH;
			pattern.enabled = true;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

			const container = new ContainerBuilder()
				.setAccentColor(0x2ea711)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Đã Xác Nhận Nguyên Nhân: \`${selectedCause}\`**\n\n` +
						`- **Server:** \`${pattern.serverScope}\`\n\n` +
						`**Regex:**\n\`x\n${pattern.pattern}\n\`\n` +
						`**Tin nhắn gốc:**\n\`\n${pattern.sampleMessage || "N/A"}\n\``
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Đã chọn nguyên nhân bởi @${interaction.user.username}*`)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" cause set to "${selectedCause}" by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error updating cause via select menu: ${err}`);
		}
	}

	/**
	 * Select Menu: Select server scope for pattern
	 */
	public static async onSelectScope(client: Discord, interaction: StringSelectMenuInteraction): Promise<void> {
		const patternId = interaction.customId.replace("select_death_scope_", "");
		const selectedScope = interaction.values[0];
		await interaction.deferUpdate();

		try {
			const pattern = await DeathPatternModel.findById(patternId);
			if (!pattern) {
				await interaction.followUp({
					content: "Không tìm thấy pattern này trong database.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			pattern.serverScope = selectedScope;
			pattern.confirmedBy = interaction.user.tag || interaction.user.username;
			await pattern.save();

			await RedisManager.invalidateDeathPatterns(pattern.serverScope);

			const container = new ContainerBuilder()
				.setAccentColor(0x3498db)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Đã Cập Nhật Phạm Vi Server: \`${selectedScope}\`**\n` +
						`*Đã cập nhật bởi @${interaction.user.username}*`
					)
				);

			await interaction.editReply({ components: [container] });
			client.logger.info(`[DeathVerification] Pattern "${pattern.name}" scope updated to "${selectedScope}" by ${interaction.user.tag}`);
		} catch (err) {
			client.logger.error(`[DeathVerification] Error updating scope via select menu: ${err}`);
		}
	}
}
