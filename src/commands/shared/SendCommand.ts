import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { MailService } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { ChatParser, formatRelativeTime, messageColors } from "../../utils";

export class SendCommand extends Command {
	constructor() {
		super({
			name: "send",
			aliases: ["mail", "msg", "offline-msg", "nhantin", "thu"],
			description: "Gửi lời nhắn offline xuyên nền tảng cho người chơi (tự động giao khi người nhận online)",
			usage: ">send <tên_người_chơi> <nội_dung> hoặc >mail list",
			inGameUsage: "!send <tên_player> <nội_dung> hoặc !mail inbox",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost, bot } = ctx;

		if (args.length === 0) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>send MoonVN mai đi farm wither nhe\`)`,
			});
			return;
		}

		const subCommand = args[0].toLowerCase().trim();

		// Subcommand: >mail list
		if (subCommand === "list" || subCommand === "pending" || subCommand === "danhsach") {
			const pendingMails = await MailService.getSentPendingMails(serverHost, message.author.id);
			if (!pendingMails || pendingMails.length === 0) {
				await message.reply({
					content: `Bạn chưa có thư offline nào đang chờ giao trên server \`${serverHost}\`.`,
				});
				return;
			}

			const lines = pendingMails.map((m, idx) => {
				const timeAgo = `<t:${Math.floor(m.createdAt.getTime() / 1000)}:R>`;
				return `\`#${idx + 1}\` ID: \`${m._id}\` → **${m.receiverDisplayName}** (${timeAgo}):\n> ${ChatParser.escapeDiscordFormat(m.message)}`;
			});

			const container = new ContainerBuilder()
				.setAccentColor(0x3498db)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Danh Sách Thư Đang Chờ Giao (${pendingMails.length})**\n\n${lines.join("\n\n")}\n\n*Gõ \`>mail cancel <id>\` để hủy thư chưa giao.*`
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
			return;
		}

		// Subcommand: >mail cancel <id>
		if (subCommand === "cancel" || subCommand === "huy") {
			const mailId = args[1];
			if (!mailId) {
				await message.reply({ content: "Cú pháp: `>mail cancel <id_thư>`" });
				return;
			}

			const cancelled = await MailService.cancelMail(mailId, message.author.id);
			if (cancelled) {
				await message.reply({ content: `✅ Đã hủy thành công thư có ID \`${mailId}\`.` });
			} else {
				await message.reply({ content: `❌ Không tìm thấy thư đang chờ nào của bạn với ID \`${mailId}\`.` });
			}
			return;
		}

		// Normal send: >send <player> <message...>
		const targetUser = args[0];
		const mailContent = args.slice(1).join(" ");

		if (!mailContent) {
			await message.reply({
				content: `Vui lòng nhập nội dung lời nhắn: \`>send ${targetUser} <nội_dung>\``,
			});
			return;
		}

		const result = await MailService.sendMail({
			server: serverHost,
			sender: message.author.displayName || message.author.username,
			senderPlatform: "discord",
			senderId: message.author.id,
			channelId: message.channel.id,
			receiver: targetUser,
			message: mailContent,
			bot,
		});

		if (!result.success) {
			if (result.error === "PLAYER_NOT_SEEN") {
				await message.reply({
					content: `❌ [Lỗi] Người chơi **${targetUser}** chưa từng xuất hiện trên server \`${serverHost}\`. Không thể gửi thư!`,
				});
			} else if (result.error === "TOO_LONG") {
				await message.reply({
					content: `❌ [Lỗi] Nội dung thư quá dài! Tối đa 256 ký tự (Hiện tại: ${mailContent.length} ký tự).`,
				});
			} else {
				await message.reply({
					content: `❌ [Lỗi] Không thể gửi thư: ${result.error}`,
				});
			}
			return;
		}

		const avatarUrl = `https://mc-heads.net/avatar/${targetUser}/64.png`;
		const statusText = result.isDeliveredInstantly
			? "⚡ **Người chơi hiện đang online, thư đã được chuyển phát ngay lập tức!**"
			: "⏳ **Đã lưu vào Hộp thư Offline. Thư sẽ được tự động chuyển ngay khi người chơi vào server.**";

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**✉️ Hộp Thư: Đã Lưu Lời Nhắn**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **Người nhận:** **${result.receiverDisplayName}**\n` +
					`- **Người gửi:** <@${message.author.id}> (Discord)\n` +
					`- **Nội dung:**\n> ${ChatParser.escapeDiscordFormat(mailContent)}\n\n` +
					`${statusText}`
				)
			)
			.setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl).setDescription(`Avatar của ${result.receiverDisplayName}`));

		const container = new ContainerBuilder()
			.setAccentColor(result.isDeliveredInstantly ? messageColors.join : 0x3498db)
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

	public async executeInGame(ctx: InGameCommandContext): Promise<string[] | string | void> {
		const { bot, sender, args, serverHost } = ctx;

		if (args.length === 0) {
			return `[Hộp thư] Cú pháp: !send <tên_player> <nội_dung> hoặc !mail inbox`;
		}

		const subCommand = args[0].toLowerCase().trim();

		// Subcommand: !mail inbox / !mail read / !mail list
		if (subCommand === "inbox" || subCommand === "read" || subCommand === "list" || subCommand === "hopthu") {
			const inbox = await MailService.getInbox(serverHost, sender, 3);
			const totalPending = inbox.pending.length;
			const totalDelivered = inbox.delivered.length;

			if (totalPending === 0 && totalDelivered === 0) {
				return `[Hộp thư] Hộp thư của bạn hiện không có tin nhắn nào.`;
			}

			const lines: string[] = [
				`[Hộp thư - Chưa đọc: ${totalPending} | Đã đọc: ${totalDelivered}]`,
			];

			if (totalPending > 0) {
				lines.push("--- Thư chưa đọc ---");
				inbox.pending.forEach((m, idx) => {
					const timeAgo = formatRelativeTime(m.createdAt);
					lines.push(`#${idx + 1}. Từ ${m.sender} (${timeAgo}): "${m.message}"`);
				});
			}

			if (totalDelivered > 0) {
				lines.push("--- Thư đã đọc gần đây ---");
				inbox.delivered.forEach((m, idx) => {
					const timeAgo = formatRelativeTime(m.createdAt);
					lines.push(`• Từ ${m.sender} (${timeAgo}): "${m.message}"`);
				});
			}

			lines.push("Gõ !mail clear để xóa các thư đã đọc.");
			return lines;
		}

		// Subcommand: !mail clear / !mail xoa
		if (subCommand === "clear" || subCommand === "xoa") {
			const count = await MailService.clearReadMails(serverHost, sender);
			return `[Hộp thư] Đã dọn dẹp ${count} thư đã đọc khỏi hộp thư của bạn.`;
		}

		// Normal send: !send <player> <message...>
		const targetUser = args[0];
		const mailContent = args.slice(1).join(" ");

		if (!mailContent) {
			return `[Hộp thư] Vui lòng nhập nội dung lời nhắn: !send ${targetUser} <nội_dung>`;
		}

		const result = await MailService.sendMail({
			server: serverHost,
			sender,
			senderPlatform: "minecraft",
			receiver: targetUser,
			message: mailContent,
			bot,
		});

		if (!result.success) {
			if (result.error === "PLAYER_NOT_SEEN") {
				return `[Hộp thư] Người chơi "${targetUser}" chưa từng xuất hiện trên server này!`;
			}
			if (result.error === "SELF_SEND") {
				return `[Hộp thư] Bạn không thể tự gửi thư cho chính mình!`;
			}
			if (result.error === "TOO_LONG") {
				return `[Hộp thư] Nội dung thư quá dài! Tối đa 256 ký tự (Hiện tại: ${mailContent.length} ký tự).`;
			}
			return `[Hộp thư] Không thể gửi thư: ${result.error}`;
		}

		if (result.isDeliveredInstantly) {
			return `[Hộp thư] "${result.receiverDisplayName}" hiện đang online. Đã chuyển phát tin nhắn ngay cho người chơi!`;
		}

		return `[Hộp thư] Đã gửi tin nhắn đến "${result.receiverDisplayName}". Người chơi sẽ nhận được ngay khi vào server!`;
	}
}
