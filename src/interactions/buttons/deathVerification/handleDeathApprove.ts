import {
	ButtonInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
} from "discord.js";
import { Discord } from "../../../structures";
import { DeathPatternModel } from "../../../database/models/DeathPatternModel";
import { RedisManager } from "../../../redis/RedisManager";

export async function handleDeathApprove(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_approve_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
			return;
		}

		pattern.enabled = true;
		pattern.confirmedBy = interaction.user.tag || interaction.user.username;
		await pattern.save();

		await RedisManager.invalidateDeathPatterns(pattern.serverScope);

		const container = new ContainerBuilder()
			.setAccentColor(0x2ea711)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Death Message Đã Được Xác Minh**\n\n` +
					`- **Server:** \`${pattern.serverScope}\` | **Nguyên nhân:** \`${pattern.cause}\`\n` +
					`- **Regex:** \`\`\`regex\n${pattern.pattern}\`\`\`\n` +
					`- **Tin nhắn gốc:** \`\`\`${pattern.sampleMessage || "N/A"}\`\`\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`*Đã duyệt bởi @${interaction.user.username} (${interaction.user.id})*`)
			);

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" approved by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error approving pattern: ${err}`);
	}
}
