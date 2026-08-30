import {
	StringSelectMenuInteraction,
	MessageFlags,
	ContainerBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { Discord } from "../../structures";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { RedisManager } from "../../redis/RedisManager";

export async function handleScopeSelectMenu(client: Discord, interaction: StringSelectMenuInteraction): Promise<void> {
	const patternId = interaction.customId.replace("select_death_scope_", "");
	const selectedScope = interaction.values[0];

	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
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

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" scope updated to "${selectedScope}" by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error updating scope via select menu: ${err}`);
	}
}
