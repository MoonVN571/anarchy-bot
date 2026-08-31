import {
	ButtonInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
} from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";
import { DeathCause } from "../../../database/models/DeathModel";
import { DeathParserService } from "../../../services/DeathParserService";

export async function handleDeathResolvePvp(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_resolve_pvp_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
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
					`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`PVP\`\n` +
					`- **Regex:** \`\`\`regex\n${pattern.pattern}\`\`\`\n` +
					`- **Tin nhắn gốc:** \`\`\`${pattern.sampleMessage || "N/A"}\`\`\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`*Đã duyệt bởi @${interaction.user.username}*`)
			);

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" resolved as PVP by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error resolving PvP pattern: ${err}`);
	}
}
