import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { formatDuration } from "../utils";
import { messageColors } from "../utils";

export class PingCommand extends Command {
	constructor() {
		super({
			name: "ping",
			aliases: ["ms", "latency"],
			description: "Kiểm tra độ trễ mạng của bot đến máy chủ Minecraft và Discord Gateway",
			usage: ">ping",
			inGameUsage: "!ping",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, client, serverHost } = ctx;

		const botPing = bot.bot?.player?.ping ?? 0;
		const discordPing = client.ws.ping;
		const uptimeStr = bot.uptime > 0 ? formatDuration(Math.floor((Date.now() - bot.uptime) / 1000)) : "0s";

		const container = new ContainerBuilder()
			.setAccentColor(messageColors.server)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Độ Trễ & Hiệu Năng Bot**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Minecraft Ping:** \`${botPing}ms\`\n` +
					`- **Discord Gateway:** \`${discordPing}ms\`\n` +
					`- **Thời gian Online liên tục:** \`${uptimeStr}\``
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const { bot } = ctx;
		const botPing = bot.bot?.player?.ping ?? 0;
		const uptimeStr = bot.uptime > 0 ? formatDuration(Math.floor((Date.now() - bot.uptime) / 1000)) : "0s";

		return `[Ping] Bot Ping: ${botPing}ms | Uptime: ${uptimeStr}`;
	}
}
