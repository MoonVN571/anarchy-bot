import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../../typings";

export class OnlineCommand extends Command {
	constructor() {
		super({
			name: "online",
			aliases: ["list", "players", "who", "on"],
			description: "Xem danh sách người chơi đang online trong server Minecraft",
			usage: ">online",
			inGameUsage: "!online",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, serverHost } = ctx;

		if (!bot || !bot.bot || !bot.bot.players) {
			await message.reply({
				content: `Bot Minecraft chưa kết nối hoặc chưa đồng bộ danh sách người chơi trên server \`${serverHost}\`.`,
			});
			return;
		}

		const players = Object.values(bot.bot.players)
			.filter(p => p && p.username)
			.map(p => p.username);

		const maxShow = 60;
		const displayPlayers = players.slice(0, maxShow);
		const remaining = players.length - maxShow;

		let playerListStr = displayPlayers.map(name => `\`${name}\``).join(", ");
		if (remaining > 0) {
			playerListStr += ` và **+${remaining} người chơi khác...**`;
		}

		const container = new ContainerBuilder()
			.setAccentColor(0x2ecc71)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Danh Sách Người Chơi Đang Online (${players.length})**\n\n` +
					(players.length > 0 ? playerListStr : "*Hiện không có người chơi nào online.*")
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`Ping bot: **${bot.bot.player?.ping || 0}ms**\n<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		if (!ctx.bot || !ctx.bot.bot || !ctx.bot.bot.players) {
			return `[Online] Bot chưa đồng bộ danh sách người chơi online.`;
		}

		const players = Object.values(ctx.bot.bot.players)
			.filter(p => p && p.username)
			.map(p => p.username);

		const preview = players.slice(0, 10).join(", ");
		const extra = players.length > 10 ? ` và +${players.length - 10} người chơi khác` : "";

		return `[Online] ${players.length} người chơi online: ${preview}${extra}`;
	}
}
