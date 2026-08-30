import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { ParsedChatMessage, MessageType, messageColors } from "./chatParser";

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
	public static renderPlayerChatContainer(parsed: ParsedChatMessage): ContainerBuilder {
		const accentColor = messageColors[parsed.type] || 0x979797;

		const username = parsed.username || "Player";
		const headUrl = parsed.avatarUrl || `https://mc-heads.net/avatar/${username}/64.png`;
		const timeTag = this.getDiscordTimestamp("F");

		const rankPrefix = parsed.rank ? `\`[${parsed.rank}]\` ` : "";
		const userTitle = `**${rankPrefix}${username}**`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${userTitle}\n${parsed.message}`)
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
	public static renderPvPDeathContainer(parsed: ParsedChatMessage, _serverHost: string): ContainerBuilder {
		const killer = parsed.killer || "Unknown";
		const victim = parsed.victim || "Unknown";
		const timeTag = this.getDiscordTimestamp("F");

		const killerHead = `https://mc-heads.net/avatar/${killer}/64.png`;
		const victimHead = `https://mc-heads.net/avatar/${victim}/64.png`;

		// Section 1: Killer Action
		const sectionKiller = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**${killer}** đã hạ gục **${victim}**${parsed.weapon ? `\n- Vũ khí: **${parsed.weapon}**` : ""}`
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
	public static renderEventContainer(parsed: ParsedChatMessage, _serverHost: string): ContainerBuilder {
		const timeTag = this.getDiscordTimestamp("F");
		const accentColor = messageColors[parsed.type] || 0x979797;

		// 1. Join Event
		if (parsed.type === MessageType.Join && parsed.username) {
			const headUrl = `https://mc-heads.net/avatar/${parsed.username}/64.png`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`+ **${parsed.username}** đã tham gia server`)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 2. Quit Event
		if (parsed.type === MessageType.Quit && parsed.username) {
			const headUrl = `https://mc-heads.net/avatar/${parsed.username}/64.png`;

			const section = new SectionBuilder()
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`- **${parsed.username}** đã rời khỏi server`)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

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
						`**${parsed.victim}** đã bị tiêu diệt\n- Quái vật: **${parsed.mob}**\n> \`${parsed.rawText}\``
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
						`**${victimName}** đã tử vong\n> \`${parsed.rawText}\``
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
					new TextDisplayBuilder().setContent(`**${parsed.username}** đã đạt thành tựu\n> \`${parsed.formattedMsg || parsed.rawText}\``)
				)
				.setThumbnailAccessory(new ThumbnailBuilder().setURL(headUrl));

			return new ContainerBuilder()
				.setAccentColor(accentColor)
				.addSectionComponents(section)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(new TextDisplayBuilder().setContent(timeTag));
		}

		// 6. Default Server / Queue / Announcement / Whisper
		return new ContainerBuilder()
			.setAccentColor(accentColor)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(parsed.formattedMsg || parsed.rawText)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(timeTag)
			);
	}
}
