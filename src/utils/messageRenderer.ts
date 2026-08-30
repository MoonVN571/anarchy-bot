import { APIEmbed } from "discord.js";
import { MessageType, ParsedChatMessage, messageColors } from "./chatParser";

export class MessageRenderer {
	/**
	 * Build rich embed representation for non-chat events (Join, Quit, Death, Server, Queue)
	 */
	public static renderEventEmbed(parsed: ParsedChatMessage, serverHost: string): APIEmbed {
		const baseColor = messageColors[parsed.type] || 0x979797;
		const timestamp = new Date().toISOString();

		// 1. Join Event
		if (parsed.type === MessageType.Join && parsed.username) {
			return {
				color: 0x2ecc71,
				description: `+ \`${parsed.username}\` đã tham gia server`,
				thumbnail: { url: `https://mc-heads.net/avatar/${parsed.username}/64.png` },
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 2. Quit Event
		if (parsed.type === MessageType.Quit && parsed.username) {
			return {
				color: 0xe67e22,
				description: `- \`${parsed.username}\` đã rời khỏi server`,
				thumbnail: { url: `https://mc-heads.net/avatar/${parsed.username}/64.png` },
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 3. Death Event
		if (parsed.type === MessageType.Dead) {
			// Case 3.1: PvP Kill between 2 players
			if (parsed.victim && parsed.killer) {
				const fields = [
					{ name: "Kẻ hạ gục (Killer)", value: `\`${parsed.killer}\``, inline: true },
					{ name: "Nạn nhân (Victim)", value: `\`${parsed.victim}\``, inline: true },
				];
				if (parsed.weapon) {
					fields.push({ name: "Vũ khí (Weapon)", value: `\`${parsed.weapon}\``, inline: true });
				}

				return {
					color: 0xe74c3c,
					author: {
						name: `PvP Kill | ${parsed.killer}`,
						icon_url: `https://mc-heads.net/avatar/${parsed.killer}/64.png`,
					},
					description: `**${parsed.killer}** đã hạ gục **${parsed.victim}**${parsed.weapon ? ` bằng **${parsed.weapon}**` : ""}\n> \`${parsed.rawText}\``,
					thumbnail: { url: `https://mc-heads.net/avatar/${parsed.victim}/128.png` },
					fields,
					footer: { text: serverHost },
					timestamp,
				};
			}

			// Case 3.2: Mob Kill
			if (parsed.victim && parsed.mob) {
				return {
					color: 0xc0392b,
					author: {
						name: `Mob Death | ${parsed.mob}`,
					},
					description: `**${parsed.victim}** đã bị **${parsed.mob}** tiêu diệt\n> \`${parsed.rawText}\``,
					thumbnail: { url: `https://mc-heads.net/avatar/${parsed.victim}/128.png` },
					fields: [
						{ name: "Nạn nhân", value: `\`${parsed.victim}\``, inline: true },
						{ name: "Quái vật", value: `\`${parsed.mob}\``, inline: true },
					],
					footer: { text: serverHost },
					timestamp,
				};
			}

			// Case 3.3: Environment / Fall / Void / Suicide
			const victimName = parsed.victim || parsed.username || parsed.targetUser;
			const victimHead = victimName ? `https://mc-heads.net/avatar/${victimName}/128.png` : undefined;

			return {
				color: 0x95a5a6,
				author: {
					name: victimName ? `Tử vong | ${victimName}` : "Thông báo Tử vong",
					icon_url: victimHead,
				},
				description: `> \`${parsed.rawText}\``,
				thumbnail: victimHead ? { url: victimHead } : undefined,
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 4. Achievement Event
		if (parsed.type === MessageType.Achievement) {
			const playerName = parsed.username;
			const head = playerName ? `https://mc-heads.net/avatar/${playerName}/64.png` : undefined;

			return {
				color: 0x9b59b6,
				description: `${parsed.formattedMsg || parsed.rawText}`,
				thumbnail: head ? { url: head } : undefined,
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 5. Default Server / Queue / Announcement
		return {
			color: baseColor,
			description: parsed.formattedMsg || parsed.rawText,
			footer: { text: serverHost },
			timestamp,
		};
	}
}
