import {
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextChannel,
	TextDisplayBuilder,
	User,
} from "discord.js";
import { Minecraft, Discord } from "../../structures";

export class CommandLoggerService {
	/**
	 * Log in-game Minecraft command execution with user command and bot response
	 */
	public static async logInGameCommand(
		bot: Minecraft,
		sender: string,
		rawCommand: string,
		response?: string | string[] | void
	): Promise<void> {
		if (!bot) return;

		let logChannel = bot.commandLogChannel;
		if (!logChannel) {
			const cmdLogChanId = bot.config.commandLogChannelId || bot.config.livechat.commandLogChannelId;
			if (cmdLogChanId) {
				const ch = bot.client.channels.cache.get(cmdLogChanId);
				if (ch && ch.isTextBased()) {
					logChannel = ch as TextChannel;
					bot.commandLogChannel = logChannel;
				}
			}
		}

		if (!logChannel) return;

		let replyText = "(Không có phản hồi trực tiếp)";
		if (Array.isArray(response)) {
			replyText = response.filter(Boolean).join("\n");
		} else if (typeof response === "string" && response.trim().length > 0) {
			replyText = response.trim();
		}

		const timestamp = Math.floor(Date.now() / 1000);
		const serverName = bot.config.name || bot.config.connection.host;
		const cmdName = rawCommand.startsWith("!") ? rawCommand.split(/\s+/)[0].slice(1) : rawCommand.split(/\s+/)[0];

		const container = new ContainerBuilder()
			.setAccentColor(0x38bdf8) // Sky Blue
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**[Command Log | In-game] !${cmdName}**\n` +
					`- **Máy chủ:** \`${serverName}\`\n` +
					`- **Người thực thi (User):** \`${sender}\`\n` +
					`- **Thời gian:** <t:${timestamp}:T> (<t:${timestamp}:R>)`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**User:** \`${rawCommand}\`\n` +
					`**Bot:**\n\`\`\`text\n${replyText}\n\`\`\``
				)
			);

		try {
			await logChannel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (err) {
			bot.client.logger.error(`[CommandLoggerService] Failed to send in-game command log: ${err}`);
		}
	}

	/**
	 * Log Discord command execution
	 */
	public static async logDiscordCommand(
		client: Discord,
		bot: Minecraft | undefined,
		author: User,
		channelName: string,
		rawContent: string,
		cmdName: string
	): Promise<void> {
		const targetChannelId =
			bot?.config?.commandLogChannelId ||
			bot?.config?.livechat?.commandLogChannelId ||
			(client.dev ? "1545382765032243220" : "1545382026109128744");

		if (!targetChannelId) return;

		const logChannel = client.channels.cache.get(targetChannelId) as TextChannel;
		if (!logChannel || !logChannel.isTextBased()) return;

		const timestamp = Math.floor(Date.now() / 1000);
		const serverInfo = bot ? `\`${bot.config.name || bot.config.connection.host}\`` : "`Discord Global`";

		const container = new ContainerBuilder()
			.setAccentColor(0x5865f2) // Blurple
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**[Command Log | Discord] >${cmdName}**\n` +
					`- **Người dùng:** <@${author.id}> (\`${author.tag}\`)\n` +
					`- **Kênh Discord:** \`#${channelName}\`\n` +
					`- **Máy chủ liên kết:** ${serverInfo}\n` +
					`- **Thời gian:** <t:${timestamp}:T> (<t:${timestamp}:R>)`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**User:** \`${rawContent}\``
				)
			);

		try {
			await logChannel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (err) {
			client.logger.error(`[CommandLoggerService] Failed to send Discord command log: ${err}`);
		}
	}
}
