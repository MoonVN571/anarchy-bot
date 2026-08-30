import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";

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

		const embed = new EmbedBuilder()
			.setColor(0x2ecc71)
			.setTitle(`Danh Sách Người Chơi Đang Online (${players.length})`)
			.setDescription(players.length > 0 ? playerListStr : "*Hiện không có người chơi nào online.*")
			.addFields(
				{ name: "Máy chủ", value: `\`${serverHost}\``, inline: true },
				{ name: "Ping bot", value: `${bot.bot.player?.ping || 0}ms`, inline: true }
			)
			.setFooter({ text: `Server: ${serverHost} | anarchy-bot` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		if (!ctx.bot || !ctx.bot.bot || !ctx.bot.bot.players) {
			return `[Online] Bot chua dong bo danh sach online.`;
		}

		const players = Object.values(ctx.bot.bot.players)
			.filter(p => p && p.username)
			.map(p => p.username);

		const preview = players.slice(0, 10).join(", ");
		const extra = players.length > 10 ? ` va +${players.length - 10} players khac` : "";

		return `[Online] ${players.length} players online: ${preview}${extra}`;
	}
}
