import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { StatsService } from "../services/StatsService";
import { formatTimeAgo } from "../utils/timeFormat";
import { messageColors } from "../utils/chatParser";

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
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>seen MoonVN\`)`,
			});
			return;
		}

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);
		if (!stats) {
			await message.reply({
				content: `Không tìm thấy dữ liệu người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const isOnline = stats.isOnline;
		const lastSeenDate = stats.lastSeen ? new Date(stats.lastSeen).toLocaleString("vi-VN") : "Không rõ";
		const timeAgo = stats.lastSeen ? formatTimeAgo(new Date(stats.lastSeen)) : "N/A";
		const avatarUrl = `https://mc-heads.net/avatar/${stats.displayName}/64.png`;

		const statusText = isOnline
			? "🟢 **Hiện đang ONLINE trên máy chủ**"
			: `🔴 **Offline** (Lần cuối: \`${lastSeenDate}\` - *${timeAgo}*)`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Trạng Thái Hoạt Động: ${stats.displayName}**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Trạng thái:** ${statusText}\n` +
					`- **Tổng số lần rời server:** \`${stats.leaveCount || 0}\` lần`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${stats.displayName}`));

		const container = new ContainerBuilder()
			.setAccentColor(isOnline ? messageColors.join : messageColors.quit)
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
		const { sender, args, serverHost } = ctx;
		const targetUser = args[0] || sender;

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);
		if (!stats) {
			return `[Seen] Không tìm thấy dữ liệu người chơi "${targetUser}"!`;
		}

		if (stats.isOnline) {
			return `[Seen] ${stats.displayName} hiện đang ONLINE trên server!`;
		}

		const formattedDate = stats.lastSeen ? new Date(stats.lastSeen).toLocaleString("vi-VN") : "N/A";
		const timeAgo = stats.lastSeen ? formatTimeAgo(new Date(stats.lastSeen)) : "N/A";

		return `[Seen] ${stats.displayName} online lần cuối vào: ${formattedDate} (${timeAgo})`;
	}
}
