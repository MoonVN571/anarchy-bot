import { APIEmbed } from "discord.js";
import { MessageType, ParsedChatMessage, messageColors } from "../minecraft/chatParser";

export class MessageRenderer {
	/**
	 * Build rich embed representation for non-chat events (Join, Quit, Death, Server, Queue)
	 */
	public static renderEventEmbed(parsed: ParsedChatMessage, serverHost: string, repeatCount?: number): APIEmbed {
		const baseColor = messageColors[parsed.type] || 0x979797;
		const timestamp = new Date().toISOString();
		const countTag = repeatCount && repeatCount > 1 ? ` [x${repeatCount}]` : "";

		// 1. Join Event
		if (parsed.type === MessageType.Join) {
			const username = parsed.username || "Player";
			const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : "";
			return {
				color: 0x2ecc71,
				description: `+ **${rankPrefix}${username}** đã tham gia server${countTag}\n> \`${parsed.rawText}\``,
				thumbnail: { url: `https://mc-heads.net/avatar/${username}/64.png` },
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 2. Quit Event
		if (parsed.type === MessageType.Quit) {
			const username = parsed.username || "Player";
			const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : "";
			return {
				color: 0xe67e22,
				description: `- **${rankPrefix}${username}** đã rời khỏi server${countTag}\n> \`${parsed.rawText}\``,
				thumbnail: { url: `https://mc-heads.net/avatar/${username}/64.png` },
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
						name: `PvP Kill | ${parsed.killer}${countTag}`,
						icon_url: `https://mc-heads.net/avatar/${parsed.killer}/64.png`,
					},
					description: `**${parsed.killer}** đã hạ gục **${parsed.victim}**${countTag}${parsed.weapon ? ` bằng **${parsed.weapon}**` : ""}\n> \`${parsed.rawText}\``,
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
						name: `Mob Death | ${parsed.mob}${countTag}`,
					},
					description: `**${parsed.victim}** đã bị **${parsed.mob}** tiêu diệt${countTag}\n> \`${parsed.rawText}\``,
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
					name: victimName ? `Tử vong | ${victimName}${countTag}` : `Thông báo Tử vong${countTag}`,
					icon_url: victimHead,
				},
				description: `> \`${parsed.rawText}\`${countTag}`,
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
				description: `${parsed.formattedMsg || parsed.rawText}${countTag}`,
				thumbnail: head ? { url: head } : undefined,
				footer: { text: serverHost },
				timestamp,
			};
		}

		// 5. Default Server / Queue / Announcement
		return {
			color: baseColor,
			description: `${parsed.formattedMsg || parsed.rawText}${countTag}`,
			footer: { text: serverHost },
			timestamp,
		};
	}

	/**
	 * Build rich embed representation for player chat
	 */
	public static renderPlayerChatEmbed(parsed: ParsedChatMessage, serverHost: string, repeatCount?: number): APIEmbed {
		const baseColor = messageColors[parsed.type] || 0x979797;
		const username = parsed.username || "Player";
		const headUrl = parsed.avatarUrl || `https://mc-heads.net/avatar/${username}/64.png`;
		const rankPrefix = parsed.rank ? `[${parsed.rank}] ` : "";
		const countTag = repeatCount && repeatCount > 1 ? ` [x${repeatCount}]` : "";

		return {
			color: baseColor,
			author: {
				name: `${rankPrefix}${username}${countTag}`,
				icon_url: headUrl,
			},
			description: parsed.message || parsed.rawText,
			footer: { text: serverHost },
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Unified embed renderer for any parsed chat message
	 */
	public static renderEmbed(parsed: ParsedChatMessage, serverHost: string, repeatCount?: number): APIEmbed {
		if (
			(parsed.type === MessageType.Chat || parsed.type === MessageType.HighlightChat) &&
			parsed.username
		) {
			return this.renderPlayerChatEmbed(parsed, serverHost, repeatCount);
		}
		return this.renderEventEmbed(parsed, serverHost, repeatCount);
	}
}
