import {
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { MessageModel } from "../../database/models/MessageModel";
import { formatRelativeTime, formatTimeAgo } from "../../utils";
import { messageColors, ChatParser } from "../../utils";

export class LastMessageCommand extends Command {
	constructor() {
		super({
			name: "lastmessage",
			aliases: ["lm", "lastmsg"],
			description: "Tra cứu câu tin nhắn gần nhất của người chơi gửi trên máy chủ",
			usage: ">lastmessage <tên_người_chơi>",
			inGameUsage: "!lm [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>lm MoonVN\`)`,
			});
			return;
		}

		const lowerUser = targetUser.toLowerCase().trim();
		const lastMsg = await MessageModel.findOne({
			server: serverHost,
			username: lowerUser,
		}).sort({ timestamp: -1 });

		if (!lastMsg) {
			await message.reply({
				content: `Không tìm thấy câu chat nào của người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const playerName = lastMsg.displayName || lastMsg.username || targetUser;
		const formattedDate = new Date(lastMsg.timestamp).toLocaleString("vi-VN");
		const timeAgo = formatTimeAgo(new Date(lastMsg.timestamp));
		const avatarUrl = `https://mc-heads.net/avatar/${lastMsg.username || playerName}/64.png`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Tin Nhắn Gần Nhất: ${playerName}**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Thời gian:** \`${formattedDate}\` (*${timeAgo}*)\n` +
					`- **Nội dung:**\n> ${ChatParser.escapeDiscordFormat(lastMsg.message)}`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${playerName}`));

		const container = new ContainerBuilder()
			.setAccentColor(messageColors.chat)
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
		const lowerUser = targetUser.toLowerCase().trim();

		const lastMsg = await MessageModel.findOne({
			server: serverHost,
			username: lowerUser,
		}).sort({ timestamp: -1 });

		if (!lastMsg) {
			return `[LastMsg] Không tìm thấy câu chat nào của "${targetUser}"!`;
		}

		const timeAgo = formatRelativeTime(new Date(lastMsg.timestamp));
		return `[LastMsg] ${lastMsg.displayName} (${timeAgo}): "${lastMsg.message}"`;
	}
}
