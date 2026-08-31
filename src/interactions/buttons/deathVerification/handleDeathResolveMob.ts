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

export async function handleDeathResolveMob(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_resolve_mob_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
			return;
		}

		pattern.cause = DeathCause.MOB;
		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await DeathParserService.onPatternApproved(client, pattern, interaction.user.username);

		const container = new ContainerBuilder()
			.setAccentColor(0x3498db)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Đã Xác Nhận Là Quái Vật (Mob)**\n\n` +
					`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`MOB\`\n` +
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

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" resolved as MOB by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error resolving Mob pattern: ${err}`);
	}
}
