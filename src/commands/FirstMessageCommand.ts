import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { MessageModel } from "../database/models/MessageModel";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { ChatParser, formatTimeAgo, messageColors } from "../utils";

export class FirstMessageCommand extends Command {
	constructor() {
		super({
			name: "firstmessage",
			aliases: ["fm", "firstmsg"],
			description: "Tra cứu câu tin nhắn đầu tiên của người chơi gửi trên máy chủ",
			usage: ">firstmessage <tên_người_chơi>",
			inGameUsage: "!fm [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>fm MoonVN\`)`,
			});
			return;
		}

		const lowerUser = targetUser.toLowerCase().trim();
		const firstMsg = await MessageModel.findOne({
			server: serverHost,
			username: lowerUser,
		}).sort({ timestamp: 1 });

		if (!firstMsg) {
			await message.reply({
				content: `Không tìm thấy câu chat nào của người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const formattedDate = new Date(firstMsg.timestamp).toLocaleString("vi-VN");
		const timeAgo = formatTimeAgo(new Date(firstMsg.timestamp));
		const avatarUrl = `https://mc-heads.net/avatar/${firstMsg.displayName}/64.png`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Tin Nhắn Đầu Tiên: ${firstMsg.displayName}**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Thời gian:** \`${formattedDate}\` (*${timeAgo}*)\n` +
					`- **Nội dung:**\n> ${ChatParser.escapeDiscordFormat(firstMsg.message)}`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${firstMsg.displayName}`));

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

		const firstMsg = await MessageModel.findOne({
			server: serverHost,
			username: lowerUser,
		}).sort({ timestamp: 1 });

		if (!firstMsg) {
			return `[FirstMsg] Không tìm thấy câu chat nào của "${targetUser}"!`;
		}

		const timeAgo = formatTimeAgo(new Date(firstMsg.timestamp));
		return `[FirstMsg] ${firstMsg.displayName} (${timeAgo}): "${firstMsg.message}"`;
	}
}
