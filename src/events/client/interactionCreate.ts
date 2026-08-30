import {
	Events,
	ButtonInteraction,
	ModalSubmitInteraction,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	EmbedBuilder,
	Interaction,
} from "discord.js";
import { Discord } from "../../structures";
import { DiscordEvent } from "../../typings/DiscordEvent";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { SystemPatternModel } from "../../database/models/SystemPatternModel";
import { DeathCause } from "../../database/models/DeathModel";
import { RedisManager } from "../../redis/RedisManager";
import { SystemPatternService } from "../../services/SystemPatternService";
import { DeathParserService } from "../../services/DeathParserService";

export default class InteractionCreateEvent extends DiscordEvent {
	constructor() {
		super({
			name: Events.InteractionCreate,
			once: false,
		});
	}

	public async execute(client: Discord, interaction: Interaction): Promise<void> {
		if (interaction.isButton()) {
			await this.handleButtonInteraction(client, interaction);
		} else if (interaction.isModalSubmit()) {
			await this.handleModalSubmit(client, interaction);
		}
	}

	private async handleButtonInteraction(client: Discord, interaction: ButtonInteraction): Promise<void> {
		const { customId, user } = interaction;

		// ==========================================
		// A. DEATH REGEX VERIFICATION BUTTONS
		// ==========================================

		// 1. Resolve Conflict as PvP
		if (customId.startsWith("death_resolve_pvp_")) {
			const patternId = customId.replace("death_resolve_pvp_", "");
			await interaction.deferUpdate();

			try {
				const pattern = await DeathPatternModel.findById(patternId);
				if (!pattern) {
					await interaction.followUp({ content: "Khong tim thay pattern nay.", ephemeral: true });
					return;
				}

				pattern.cause = DeathCause.PVP;
				pattern.enabled = true;
				pattern.confirmedBy = user.tag || user.username;
				await pattern.save();

				await RedisManager.invalidateDeathPatterns(pattern.serverScope);

				const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
					.setColor(0x2ea711)
					.setTitle("Da Xac Nhan: La PvP (Nguoi Choi)")
					.setFooter({ text: `Xac nhan PvP boi @${user.username}` });

				await interaction.editReply({
					embeds: [updatedEmbed],
					components: [],
				});

				client.logger.info(`[DeathVerification] Resolved conflict as PvP for pattern "${pattern.name}" by ${user.tag}`);
			} catch (err) {
				client.logger.error(`[DeathVerification] Error resolving PvP conflict: ${err}`);
			}
			return;
		}

		// 2. Resolve Conflict as Mob
		if (customId.startsWith("death_resolve_mob_")) {
			const patternId = customId.replace("death_resolve_mob_", "");
			await interaction.deferUpdate();

			try {
				const pattern = await DeathPatternModel.findById(patternId);
				if (!pattern) {
					await interaction.followUp({ content: "Khong tim thay pattern nay.", ephemeral: true });
					return;
				}

				pattern.cause = DeathCause.MOB;
				pattern.pattern = pattern.pattern.replace(/\(\?<killer>\[a-zA-Z0-9_\]\{3,16\}\)/g, "(?<mob>.+?)");
				pattern.enabled = true;
				pattern.confirmedBy = user.tag || user.username;
				await pattern.save();

				await RedisManager.invalidateDeathPatterns(pattern.serverScope);

				const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
					.setColor(0x3498db)
					.setTitle("Da Xac Nhan: La Mob (Quai Vat)")
					.setFooter({ text: `Xac nhan Mob boi @${user.username}` });

				await interaction.editReply({
					embeds: [updatedEmbed],
					components: [],
				});

				client.logger.info(`[DeathVerification] Resolved conflict as Mob for pattern "${pattern.name}" by ${user.tag}`);
			} catch (err) {
				client.logger.error(`[DeathVerification] Error resolving Mob conflict: ${err}`);
			}
			return;
		}

		// 3. Approve Death Pattern
		if (customId.startsWith("death_approve_")) {
			const patternId = customId.replace("death_approve_", "");
			await interaction.deferUpdate();

			try {
				const pattern = await DeathPatternModel.findById(patternId);
				if (!pattern) {
					await interaction.followUp({ content: "Khong tim thay pattern nay trong database.", ephemeral: true });
					return;
				}

				pattern.enabled = true;
				pattern.confirmedBy = user.tag || user.username;
				await pattern.save();

				await RedisManager.invalidateDeathPatterns(pattern.serverScope);

				const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
					.setColor(0x2ea711)
					.setTitle("Death Message Da Duoc Xac Minh")
					.setFooter({ text: `Da duyet boi @${user.username} (${user.id})` });

				await interaction.editReply({
					embeds: [updatedEmbed],
					components: [],
				});

				client.logger.info(`[DeathVerification] Pattern "${pattern.name}" approved by ${user.tag}`);
			} catch (err) {
				client.logger.error(`[DeathVerification] Error approving pattern: ${err}`);
			}
			return;
		}

		// 4. Edit Death Pattern -> Show Modal
		if (customId.startsWith("death_edit_")) {
			const patternId = customId.replace("death_edit_", "");

			try {
				const pattern = await DeathPatternModel.findById(patternId);
				if (!pattern) {
					await interaction.reply({ content: "Khong tim thay pattern nay.", ephemeral: true });
					return;
				}

				const modal = new ModalBuilder()
					.setCustomId(`death_modal_${patternId}`)
					.setTitle("Sua Regex, Nan Nhan & Ke Giet");

				const regexInput = new TextInputBuilder()
					.setCustomId("pattern_regex")
					.setLabel("Cum bieu thuc Regex")
					.setStyle(TextInputStyle.Paragraph)
					.setValue(pattern.pattern)
					.setPlaceholder("VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) da chet$")
					.setRequired(true);

				const victimInput = new TextInputBuilder()
					.setCustomId("pattern_victim")
					.setLabel("Nan nhan thuc te (Victim)")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Nhap ten nan nhan trong cau mau")
					.setRequired(false);

				const killerInput = new TextInputBuilder()
					.setCustomId("pattern_killer")
					.setLabel("Ke giet (Killer) hoac Mob")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Nhap ten nguoi giet hoac quai vat")
					.setRequired(false);

				const causeInput = new TextInputBuilder()
					.setCustomId("pattern_cause")
					.setLabel("Nguyen nhan (PVP, MOB, FALL, VOID...)")
					.setStyle(TextInputStyle.Short)
					.setValue(pattern.cause)
					.setRequired(true);

				const scopeInput = new TextInputBuilder()
					.setCustomId("pattern_scope")
					.setLabel("Server Scope (global / IP)")
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
			return;
		}

		// 3. Dismiss Death Pattern
		if (customId.startsWith("death_dismiss_")) {
			const patternId = customId.replace("death_dismiss_", "");
			await interaction.deferUpdate();

			try {
				await DeathPatternModel.findByIdAndUpdate(patternId, { enabled: false, confirmedBy: `dismissed_by_${user.username}` });

				const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
					.setColor(0x808080)
					.setTitle("Death Message Da Bi Bo Qua")
					.setFooter({ text: `Da bo qua boi @${user.username}` });

				await interaction.editReply({
					embeds: [updatedEmbed],
					components: [],
				});

				client.logger.info(`[DeathVerification] Pattern ID ${patternId} dismissed by ${user.tag}`);
			} catch (err) {
				client.logger.error(`[DeathVerification] Error dismissing pattern: ${err}`);
			}
			return;
		}

		// ==========================================
		// B. NON-PLAYER MESSAGE CLASSIFICATION BUTTONS
		// ==========================================

		// 4. Classify as System Message
		if (customId.startsWith("classify_system_")) {
			await interaction.deferUpdate();

			try {
				const embed = interaction.message.embeds[0];
				const rawMsgField = embed.fields.find(f => f.name.includes("Noi dung tin nhan") || f.name.includes("Nội dung tin nhắn"));
				const rawMsg = rawMsgField ? rawMsgField.value.replace(/```/g, "").trim() : "";
				const serverField = embed.fields.find(f => f.name.includes("May chu") || f.name.includes("Máy chủ"));
				const serverScope = serverField ? serverField.value.replace(/`/g, "").trim() : "global";

				if (!rawMsg) {
					await interaction.followUp({ content: "Khong the trich xuat tin nhan goc tu Embed.", ephemeral: true });
					return;
				}

				// Auto-generate system regex pattern (escape special characters, replace numbers with \d+)
				let pattern = this.escapeRegex(rawMsg);
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
					confirmedBy: user.tag || user.username,
				});

				await SystemPatternService.invalidateCache(serverScope);

				const updatedEmbed = EmbedBuilder.from(embed)
					.setColor(0x3498db)
					.setTitle("Da Phan Loai La Tin Nhan He Thong (System)")
					.addFields({ name: "System Regex Da Luu", value: `\`\`\`regex\n${pattern}\`\`\`` })
					.setFooter({ text: `Da duyet System boi @${user.username}` });

				await interaction.editReply({
					embeds: [updatedEmbed],
					components: [],
				});

				client.logger.info(`[MessageClassifier] Saved system pattern for "${rawMsg}" by ${user.tag}`);
			} catch (err) {
				client.logger.error(`[MessageClassifier] Error saving system pattern: ${err}`);
			}
			return;
		}

		// 5. Classify as Death Message -> Open Modal to specify details
		if (customId.startsWith("classify_death_")) {
			try {
				const embed = interaction.message.embeds[0];
				const rawMsgField = embed.fields.find(f => f.name.includes("Noi dung tin nhan") || f.name.includes("Nội dung tin nhắn"));
				const rawMsg = rawMsgField ? rawMsgField.value.replace(/```/g, "").trim() : "";
				const serverField = embed.fields.find(f => f.name.includes("May chu") || f.name.includes("Máy chủ"));
				const serverScope = serverField ? serverField.value.replace(/`/g, "").trim() : "global";

				const modal = new ModalBuilder()
					.setCustomId(`classify_death_modal_${customId.replace("classify_death_", "")}`)
					.setTitle("Tao Death Regex Moi");

				let defaultRegex = this.escapeRegex(rawMsg);
				defaultRegex = `^${defaultRegex}$`;

				const regexInput = new TextInputBuilder()
					.setCustomId("death_regex")
					.setLabel("Cum bieu thuc Regex")
					.setStyle(TextInputStyle.Paragraph)
					.setValue(defaultRegex)
					.setPlaceholder("VD: ^(?<victim>[a-zA-Z0-9_]{3,16}) da chet$")
					.setRequired(true);

				const victimInput = new TextInputBuilder()
					.setCustomId("death_victim")
					.setLabel("Nan nhan (Victim)")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Ten nguoi choi bi chet")
					.setRequired(false);

				const killerInput = new TextInputBuilder()
					.setCustomId("death_killer")
					.setLabel("Ke giet (Killer) hoac Mob")
					.setStyle(TextInputStyle.Short)
					.setPlaceholder("Ten ke giet hoac quai vat")
					.setRequired(false);

				const causeInput = new TextInputBuilder()
					.setCustomId("death_cause")
					.setLabel("Nguyen nhan (PVP, MOB, FALL, VOID...)")
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
			return;
		}

		// 6. Dismiss Classification
		if (customId.startsWith("classify_dismiss_")) {
			await interaction.deferUpdate();

			const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
				.setColor(0x808080)
				.setTitle("Da Bo Qua Tin Nhan")
				.setFooter({ text: `Da bo qua boi @${user.username}` });

			await interaction.editReply({
				embeds: [updatedEmbed],
				components: [],
			});
		}
	}

	private async handleModalSubmit(client: Discord, interaction: ModalSubmitInteraction): Promise<void> {
		const { customId, user } = interaction;

		// Modal Submit for Edit Death Pattern
		if (customId.startsWith("death_modal_")) {
			const patternId = customId.replace("death_modal_", "");
			const newRegex = interaction.fields.getTextInputValue("pattern_regex").trim();
			const customVictim = interaction.fields.getTextInputValue("pattern_victim")?.trim();
			const customKillerOrMob = interaction.fields.getTextInputValue("pattern_killer")?.trim();
			const newCause = interaction.fields.getTextInputValue("pattern_cause").trim().toUpperCase() as DeathCause;
			const newScope = interaction.fields.getTextInputValue("pattern_scope").trim();

			await interaction.deferReply({ ephemeral: true });

			try {
				new RegExp(newRegex);

				const pattern = await DeathPatternModel.findById(patternId);
				if (!pattern) {
					await interaction.editReply({ content: "Khong tim thay pattern nay." });
					return;
				}

				pattern.pattern = newRegex;
				pattern.cause = Object.values(DeathCause).includes(newCause) ? newCause : DeathCause.UNKNOWN;
				pattern.serverScope = newScope || "global";
				pattern.enabled = true;
				pattern.confirmedBy = user.tag || user.username;
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

				await interaction.editReply({ content: "Da luu va dieu chinh K/D & Regex Pattern thanh cong!" });

				if (interaction.message) {
					const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
						.setColor(0x2ea711)
						.setTitle("Death Message Da Duoc Chinh Sua & Xac Minh")
						.setFields(
							{ name: "Server Scope", value: `\`${pattern.serverScope}\``, inline: true },
							{ name: "Nguyen nhan (Cause)", value: `\`${pattern.cause}\``, inline: true },
							...(customVictim ? [{ name: "Nan nhan (Victim)", value: `\`${customVictim}\``, inline: true }] : []),
							...(customKillerOrMob ? [{ name: "Ke ha guc / Mob", value: `\`${customKillerOrMob}\``, inline: true }] : []),
							{ name: "Tin nhan goc", value: `\`\`\`${pattern.sampleMessage || "N/A"}\`\`\`` },
							{ name: "Regex Da Sua", value: `\`\`\`regex\n${pattern.pattern}\`\`\`` }
						)
						.setFooter({ text: `Da chinh sua & duyet boi @${user.username}` });

					await interaction.message.edit({
						embeds: [updatedEmbed],
						components: [],
					});
				}

				client.logger.info(`[DeathVerification] Pattern "${pattern.name}" edited & approved by ${user.tag}`);
			} catch (err: any) {
				await interaction.editReply({ content: `Regex khong hop le: ${err.message}` });
			}
			return;
		}

		// Modal Submit for Classify as Death
		if (customId.startsWith("classify_death_modal_")) {
			const newRegex = interaction.fields.getTextInputValue("death_regex").trim();
			const customVictim = interaction.fields.getTextInputValue("death_victim")?.trim();
			const customKillerOrMob = interaction.fields.getTextInputValue("death_killer")?.trim();
			const newCause = interaction.fields.getTextInputValue("death_cause").trim().toUpperCase() as DeathCause;
			const newScope = interaction.fields.getTextInputValue("death_scope").trim();

			await interaction.deferReply({ ephemeral: true });

			try {
				new RegExp(newRegex);

				const patternName = `death_${newScope.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
				const cause = Object.values(DeathCause).includes(newCause) ? newCause : DeathCause.UNKNOWN;

				const created = await DeathPatternModel.create({
					serverScope: newScope || "global",
					name: patternName,
					pattern: newRegex,
					cause,
					priority: 50,
					enabled: true,
					confirmedBy: user.tag || user.username,
				});

				await RedisManager.invalidateDeathPatterns(newScope);

				// Retroactively update/record death if victim provided
				if (customVictim) {
					await DeathParserService.retroactivelyFixDeathStats(
						newScope,
						created.sampleMessage || "",
						customVictim,
						cause === DeathCause.PVP ? customKillerOrMob : null,
						cause === DeathCause.MOB ? customKillerOrMob : null,
						cause
					);
				}

				await interaction.editReply({ content: "Da luu Death Regex Pattern moi va cap nhat K/D!" });

				if (interaction.message) {
					const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
						.setColor(0x2ea711)
						.setTitle("Da Phan Loai La Tin Nhan Tu Vong (Death)")
						.addFields(
							{ name: "Nguyen nhan (Cause)", value: `\`${cause}\``, inline: true },
							...(customVictim ? [{ name: "Nan nhan", value: `\`${customVictim}\``, inline: true }] : []),
							...(customKillerOrMob ? [{ name: "Ke ha guc / Mob", value: `\`${customKillerOrMob}\``, inline: true }] : []),
							{ name: "Death Regex Da Luu", value: `\`\`\`regex\n${newRegex}\`\`\`` }
						)
						.setFooter({ text: `Da duyet Death boi @${user.username}` });

					await interaction.message.edit({
						embeds: [updatedEmbed],
						components: [],
					});
				}

				client.logger.info(`[MessageClassifier] Created death pattern "${newRegex}" by ${user.tag}`);
			} catch (err: any) {
				await interaction.editReply({ content: `Regex khong hop le: ${err.message}` });
			}
		}
	}

	private escapeRegex(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}



