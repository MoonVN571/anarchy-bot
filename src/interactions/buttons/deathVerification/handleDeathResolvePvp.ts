import {
	ButtonInteraction,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { DeathCause } from "../../../database/models/DeathModel";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";
import { DeathParserService } from "../../../services";
import { Discord } from "../../../structures";

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
					`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`PVP\`\n\n` +
					`**Regex:**\n\`\`\`regex\n${pattern.pattern}\n\`\`\`\n` +
					`**Tin nhắn gốc:**\n\`\`\`\n${pattern.sampleMessage || "N/A"}\n\`\`\``
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
