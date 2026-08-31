import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { StatsService } from "../services";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { formatTimeAgo, messageColors } from "../utils";

export class SeenCommand extends Command {
	constructor() {
		super({
			name: "seen",
			aliases: ["lastseen", "seenplayer"],
			description: "Kiểm tra trạng thái online hoặc lần cuối cùng nhìn thấy người chơi",
			usage: ">seen <tên_người_chơi>",
			inGameUsage: "!seen [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost, bot } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>seen MoonVN\`)`,
			});
			return;
		}

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);
		const lowerUser = targetUser.toLowerCase().trim();
		const isCurrentlyOnline = stats?.isOnline || (bot?.bot?.players ? Object.keys(bot.bot.players).some(p => p.toLowerCase() === lowerUser) : false);

		if (!stats && !isCurrentlyOnline) {
			await message.reply({
				content: `Không tìm thấy dữ liệu người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const playerName = stats?.displayName || stats?.username || targetUser;
		const lastSeenDate = stats?.lastSeen ? new Date(stats.lastSeen).toLocaleString("vi-VN") : "Vừa xong";
		const timeAgo = stats?.lastSeen ? formatTimeAgo(new Date(stats.lastSeen)) : "ngay lúc này";
		const avatarUrl = `https://mc-heads.net/avatar/${stats?.username || targetUser}/64.png`;

		const statusText = isCurrentlyOnline
			? "🟢 **Hiện đang ONLINE trên máy chủ**"
			: `🔴 **Offline** (Lần cuối: \`${lastSeenDate}\` - *${timeAgo}*)`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Trạng Thái Hoạt Động: ${playerName}**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Trạng thái:** ${statusText}\n` +
					`- **Tổng số lần rời server:** \`${stats?.leaveCount || 0}\` lần`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${playerName}`));

		const container = new ContainerBuilder()
			.setAccentColor(isCurrentlyOnline ? messageColors.join : messageColors.quit)
			.addSectionComponents(section)
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
		const { sender, args, serverHost, bot } = ctx;
		const targetUser = args[0] || sender;
		const lowerUser = targetUser.toLowerCase().trim();

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);
		const isCurrentlyOnline = stats?.isOnline || (bot?.bot?.players ? Object.keys(bot.bot.players).some(p => p.toLowerCase() === lowerUser) : false);

		if (!stats && !isCurrentlyOnline) {
			return `[Seen] Không tìm thấy dữ liệu người chơi "${targetUser}"!`;
		}

		const playerName = stats?.displayName || stats?.username || targetUser;

		if (isCurrentlyOnline) {
			return `[Seen] ${playerName} hiện đang ONLINE trên server!`;
		}

		const formattedDate = stats?.lastSeen ? new Date(stats.lastSeen).toLocaleString("vi-VN") : "N/A";
		const timeAgo = stats?.lastSeen ? formatTimeAgo(new Date(stats.lastSeen)) : "N/A";

		return `[Seen] ${playerName} online lần cuối vào: ${formattedDate} (${timeAgo})`;
	}
}
