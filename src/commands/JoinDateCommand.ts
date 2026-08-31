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

export class JoinDateCommand extends Command {
	constructor() {
		super({
			name: "joindate",
			aliases: ["jd", "firstseen", "firstjoin"],
			description: "Xem ngày giờ đầu tiên người chơi tham gia vào máy chủ",
			usage: ">joindate <tên_người_chơi>",
			inGameUsage: "!jd [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>jd MoonVN\`)`,
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

		const playerName = stats.displayName || stats.username || targetUser;
		const formattedDate = stats.firstSeen ? new Date(stats.firstSeen).toLocaleString("vi-VN") : "Không rõ";
		const timeAgo = stats.firstSeen ? formatTimeAgo(new Date(stats.firstSeen)) : "N/A";
		const avatarUrl = `https://mc-heads.net/avatar/${stats.username || playerName}/64.png`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Ngày Đầu Tiên Tham Gia: ${playerName}**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Lần đầu vào:** \`${formattedDate}\` (*${timeAgo}*)\n` +
					`- **Tổng số lần vào:** \`${stats.joinCount || 1}\` lần`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${playerName}`));

		const container = new ContainerBuilder()
			.setAccentColor(messageColors.join)
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
			return `[JoinDate] Không tìm thấy dữ liệu người chơi "${targetUser}"!`;
		}

		const playerName = stats.displayName || stats.username || targetUser;
		const formattedDate = stats.firstSeen ? new Date(stats.firstSeen).toLocaleDateString("vi-VN") : "N/A";
		const timeAgo = stats.firstSeen ? formatTimeAgo(new Date(stats.firstSeen)) : "N/A";

		return `[JoinDate] ${playerName} tham gia lần đầu vào: ${formattedDate} (${timeAgo})`;
	}
}
