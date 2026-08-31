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

export async function handleDeathSwap(client: Discord, interaction: ButtonInteraction): Promise<void> {
	const patternId = interaction.customId.replace("death_swap_", "");
	await interaction.deferUpdate();

	try {
		const pattern = await DeathPatternModel.findById(patternId);
		if (!pattern) {
			await interaction.followUp({ content: "Không tìm thấy pattern này trong database.", flags: MessageFlags.Ephemeral });
			return;
		}

		// Swap victim and killer in the regex pattern
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

		// Extract swapped victim and killer from sample message
		let swappedVictim = "N/A";
		let swappedKiller = "N/A";
		if (pattern.sampleMessage) {
			const m = pattern.sampleMessage.match(new RegExp(pattern.pattern, "i"));
			if (m && m.groups) {
				swappedVictim = m.groups.victim || "N/A";
				swappedKiller = m.groups.killer || "N/A";
			}
		}

		// Centralized approval and cache/retroactive sync
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
					`**Regex Mới:**\n\`\`\`regex\n${pattern.pattern}\n\`\`\`\n` +
					`**Tin nhắn gốc:**\n\`\`\`\n${pattern.sampleMessage || "N/A"}\n\`\`\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`*Đã đổi vị trí & duyệt bởi @${interaction.user.username} (${interaction.user.id})*`)
			);

		await interaction.editReply({
			components: [container],
		});

		client.logger.info(`[DeathVerification] Pattern "${pattern.name}" swapped (Victim: ${swappedVictim}, Killer: ${swappedKiller}) and approved by ${interaction.user.tag}`);
	} catch (err) {
		client.logger.error(`[DeathVerification] Error swapping pattern: ${err}`);
	}
}
