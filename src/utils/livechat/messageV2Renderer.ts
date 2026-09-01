import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { ParsedChatMessage, MessageType, messageColors } from "../minecraft/chatParser";

export class MessageV2Renderer {
	/**
	 * Get current Unix timestamp (seconds) formatted for Discord markdown
	 */
	public static getDiscordTimestamp(style: "t" | "T" | "d" | "D" | "f" | "F" | "R" = "F"): string {
		const unixSeconds = Math.floor(Date.now() / 1000);
		return `<t:${unixSeconds}:${style}>`;
	}

	/**
	 * Render player chat into Discord Component V2 Container with Skin Head thumbnail
	 */
	public static renderPlayerChatContainer(parsed: ParsedChatMessage, repeatCount?: number): ContainerBuilder {
		const accentColor = messageColors[parsed.type] || 0x979797;

		const username = parsed.username || "Player";
		const headUrl = parsed.avatarUrl || `https://mc-heads.net/avatar/${username}/64.png`;
		const timeTag = this.getDiscordTimestamp("F");
		const countTag = repeatCount && repeatCount > 1 ? ` \`[x${repeatCount}]\`` : "";

		const isBot = parsed.type === MessageType.BotChat;
		const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : (isBot ? "`[BOT]` " : "");
		const userTitle = `**${rankPrefix}${username}**${countTag}`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${userTitle}\n${parsed.message || parsed.rawText}`)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
			);

		return new ContainerBuilder()
			.setAccentColor(accentColor)
			.addSectionComponents(section)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(timeTag)
			);
	}

	/**
	 * Render batch player chats into a single Container with Separators
	 */
	public static renderBatchPlayerChatContainer(messages: ParsedChatMessage[]): ContainerBuilder {
		if (messages.length === 1) {
			return this.renderPlayerChatContainer(messages[0]);
		}

		const container = new ContainerBuilder().setAccentColor(0x979797);
		const timeTag = this.getDiscordTimestamp("F");

		for (let i = 0; i < messages.length; i++) {
			const msg = messages[i];
			const username = msg.username || "Player";
			const headUrl = msg.avatarUrl || `https://mc-heads.net/avatar/${username}/64.png`;
			const rankPrefix = msg.rank ? `\`[${msg.rank}]\` ` : "";
			const userTitle = `**${rankPrefix}${username}**`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${userTitle}\n${msg.message}`)
				)
				.setThumbnailAccessory(
					new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
				);

			container.addSectionComponents(section);
			container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
		}

		container.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(timeTag)
		);

		return container;
	}

	/**
	 * Render PvP Kill Event into Container with Dual Player Skin Heads
	 */
	public static renderPvPDeathContainer(parsed: ParsedChatMessage, _serverHost: string, repeatCount?: number): ContainerBuilder {
		const killer = parsed.killer || "Unknown";
		const victim = parsed.victim || "Unknown";
		const timeTag = this.getDiscordTimestamp("F");
		const countTag = repeatCount && repeatCount > 1 ? ` \`[x${repeatCount}]\`` : "";

		const killerHead = `https://mc-heads.net/avatar/${killer}/64.png`;
		const victimHead = `https://mc-heads.net/avatar/${victim}/64.png`;

		// Section 1: Killer Action
		const sectionKiller = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**${killer}** đã hạ gục **${victim}**${countTag}${parsed.weapon ? `\n- Vũ khí: **${parsed.weapon}**` : ""}`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(killerHead).setDescription(`Killer: ${killer}`));

		// Section 2: Victim Info & Raw Message
		const sectionVictim = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`> \`${parsed.rawText}\`\n- Nạn nhân: **${victim}**`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(victimHead).setDescription(`Victim: ${victim}`));

		return new ContainerBuilder()
			.setAccentColor(messageColors[MessageType.Dead]) // 0xdb2d2d
			.addSectionComponents(sectionKiller)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addSectionComponents(sectionVictim)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(timeTag)
			);
	}

	/**
	 * Render non-chat event (Join, Quit, Mob Death, Server, Queue, Achievement, Whisper) into Component V2 Container
	 */
	public static renderEventContainer(parsed: ParsedChatMessage, _serverHost: string, repeatCount?: number): ContainerBuilder {
		const timeTag = this.getDiscordTimestamp("F");
		const accentColor = messageColors[parsed.type] || 0x979797;
		const countTag = repeatCount && repeatCount > 1 ? ` \`[x${repeatCount}]\`` : "";

		// 1. Join Event
		if (parsed.type === MessageType.Join) {
			const username = parsed.username || "Player";
			const headUrl = `https://mc-heads.net/avatar/${username}/64.png`;
			const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : "";

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`+ **${rankPrefix}${username}** đã tham gia server${countTag}\n> \`${parsed.rawText}\``)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 2. Quit Event
		if (parsed.type === MessageType.Quit) {
			const username = parsed.username || "Player";
			const headUrl = `https://mc-heads.net/avatar/${username}/64.png`;
			const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : "";

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`- **${rankPrefix}${username}** đã rời khỏi server${countTag}\n> \`${parsed.rawText}\``)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 3. Mob Death Event
		if (parsed.type === MessageType.Dead && parsed.victim && parsed.mob) {
			const headUrl = `https://mc-heads.net/avatar/${parsed.victim}/64.png`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**${parsed.victim}** đã bị tiêu diệt${countTag}\n- Quái vật: **${parsed.mob}**\n> \`${parsed.rawText}\``
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 4. Other Death (Fall, Void, Suicide)
		if (parsed.type === MessageType.Dead) {
			const victimName = parsed.victim || parsed.username || parsed.targetUser || "Player";
			const headUrl = `https://mc-heads.net/avatar/${victimName}/64.png`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**${victimName}** đã tử vong${countTag}\n> \`${parsed.rawText}\``
					)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 5. Achievement / Advancement
		if (parsed.type === MessageType.Achievement && parsed.username) {
			const headUrl = `https://mc-heads.net/avatar/${parsed.username}/64.png`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`**${parsed.username}** đã đạt thành tựu${countTag}\n> \`${parsed.formattedMsg || parsed.rawText}\``)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 6. Queue Position Event
		if (parsed.type === MessageType.Queue) {
			return new ContainerBuilder()
				.setAccentColor(messageColors[MessageType.Queue]) // 0xf1c40f
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Queue Message**${countTag}\n` +
						`> ${parsed.formattedMsg || parsed.rawText}`
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 7. Server Announcement / Broadcast Event
		if (parsed.type === MessageType.Server) {
			return new ContainerBuilder()
				.setAccentColor(messageColors[MessageType.Server]) // 0x3498db
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`> ${parsed.formattedMsg || parsed.rawText}${countTag}`
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 8. Whisper Event
		if (parsed.type === MessageType.Whisper) {
			const sender = parsed.username || "Player";
			const target = parsed.targetUser || "Player";
			const headUrl = `https://mc-heads.net/avatar/${sender}/64.png`;
			const whisperTitle = `**[${sender} -> ${target}]**${countTag}`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`${whisperTitle}\n${parsed.message || parsed.rawText}`)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${sender}`));

			return new ContainerBuilder()
				.setAccentColor(messageColors[MessageType.Whisper] || 0xfd00ff)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 9. Default Event / Fallback
		return new ContainerBuilder()
			.setAccentColor(accentColor)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${parsed.formattedMsg || parsed.rawText}${countTag}`)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(timeTag)
			);
	}

	/**
	 * Render standard Bot Command Reply Container with defaultReplyColor (0x3498db)
	 */
	public static renderBotReplyContainer(
		title: string,
		content: string,
		footer?: string,
		accentColor: number = 0x3498db
	): ContainerBuilder {
		const container = new ContainerBuilder()
			.setAccentColor(accentColor)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`**${title}**\n\n${content}`)
			);

		if (footer) {
			container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1));
			container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`*${footer}*`));
		}

		return container;
	}

	/**
	 * Unified container renderer for any parsed chat message
	 */
	public static renderContainer(parsed: ParsedChatMessage, serverHost: string, repeatCount?: number): ContainerBuilder {
		if (
			(parsed.type === MessageType.Chat || parsed.type === MessageType.HighlightChat || parsed.type === MessageType.BotChat) &&
			parsed.username
		) {
			return this.renderPlayerChatContainer(parsed, repeatCount);
		}

		if (parsed.type === MessageType.Dead && parsed.killer && parsed.victim) {
			return this.renderPvPDeathContainer(parsed, serverHost, repeatCount);
		}

		return this.renderEventContainer(parsed, serverHost, repeatCount);
	}
}
