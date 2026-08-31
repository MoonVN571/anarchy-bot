import {
	StringSelectMenuInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
} from "discord.js";
import { Discord } from "../../structures";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { DeathCause } from "../../database/models/DeathModel";
import { DeathParserService } from "../../services/DeathParserService";

export async function handleCauseSelectMenu(client: Discord, interaction: StringSelectMenuInteraction): Promise<void> {
	const patternId = interaction.customId.replace("select_death_cause_", "");
	const selectedCause = interaction.values[0] as DeathCause;

	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
			return;
		}

		pattern.cause = Object.values(DeathCause).includes(selectedCause) ? selectedCause : DeathCause.UNKNOWN;
		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

		const container = new ContainerBuilder()
			.setAccentColor(0x2ea711)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Đã Xác Nhận Nguyên Nhân: \`${selectedCause}\`**\n\n` +
					`- **Server:** \`${pattern.serverScope}\`\n` +
					`- **Regex:** \`\`\`regex\n${pattern.pattern}\`\`\`\n` +
					`- **Tin nhắn gốc:** \`\`\`${pattern.sampleMessage || "N/A"}\`\`\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`*Đã chọn nguyên nhân bởi @${interaction.user.username}*`)
			);

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" cause set to "${selectedCause}" by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error updating cause via select menu: ${err}`);
	}
}
