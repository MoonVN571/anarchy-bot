import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { NoteService } from "../../services/minecraft/NoteService";

export class NoteCommand extends Command {
	constructor() {
		super({
			name: "note",
			aliases: ["notes", "ghichu", "sotay"],
			description: "Lưu trữ và chia sẻ ghi chú cá nhân (tự động bảo mật tọa độ trên LiveChat)",
			usage: "!note add <nội dung> | !note list | !note share <số> <player> | !note shared | !note view <owner> <số>",
			inGameUsage: "!note add <nội dung> | !note list | !note share <số> <player> | !note shared | !note view <owner> <số>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !note hoạt động riêng tư trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;
		const sub = (args[0] || "").toLowerCase();

		if (!sub || sub === "help") {
			return "[Note] Cú pháp: !note add <nd> | !note list | !note del <số> | !note share <số> <player> | !note shared | !note view <owner> <số>";
		}

		if (sub === "add" || sub === "them" || sub === "save") {
			const content = args.slice(1).join(" ");
			if (!content) {
				return "[Note] Vui lòng nhập nội dung cần ghi chú. Ví dụ: !note add Base tại X: 150000 Z: -300000";
			}
			const res = await NoteService.addNote(serverHost, sender, sender, content);
			return `[Note] ${res.message}`;
		}

		if (sub === "list" || sub === "ds") {
			const notes = await NoteService.getNotes(serverHost, sender);
			if (notes.length === 0) {
				return "[Note] Bạn chưa có ghi chú nào. Dùng !note add <nội dung> để lưu ghi chú đầu tiên!";
			}
			const lines = notes.map((n, idx) => {
				const sharedTag = n.sharedWith && n.sharedWith.length > 0 ? ` [Chia sẻ: ${n.sharedWith.join(",")}]` : "";
				return `#${idx + 1}. ${n.content}${sharedTag}`;
			});
			return `[Note] Ghi chú của bạn (${notes.length}/${NoteService.MAX_NOTES_PER_PLAYER}): ${lines.join(" | ")}`;
		}

		if (sub === "share" || sub === "chiasi" || sub === "allow") {
			const noteIndex = args[1];
			const targetPlayers = args.slice(2);
			if (!noteIndex || targetPlayers.length === 0) {
				return "[Note] Cú pháp: !note share <số thứ tự> <tên người chơi...>. Ví dụ: !note share 1 MoonVN Steve";
			}
			const res = await NoteService.shareNote(serverHost, sender, noteIndex, targetPlayers);
			return `[Note] ${res.message}`;
		}

		if (sub === "unshare" || sub === "revoke" || sub === "thuhoi") {
			const noteIndex = args[1];
			const targetPlayer = args[2];
			if (!noteIndex || !targetPlayer) {
				return "[Note] Cú pháp: !note unshare <số thứ tự> <tên người chơi>. Ví dụ: !note unshare 1 MoonVN";
			}
			const res = await NoteService.unshareNote(serverHost, sender, noteIndex, targetPlayer);
			return `[Note] ${res.message}`;
		}

		if (sub === "shared" || sub === "duocchiase" || sub === "sharedlist") {
			const sharedNotes = await NoteService.getSharedNotes(serverHost, sender);
			if (sharedNotes.length === 0) {
				return "[Note] Chưa có ai chia sẻ ghi chú nào cho bạn.";
			}
			const lines = sharedNotes.map(n => `[Từ ${n.displayName || n.username}]: ${n.content}`);
			return `[Note] Các ghi chú được chia sẻ cho bạn (${sharedNotes.length}): ${lines.join(" | ")}`;
		}

		if (sub === "view" || sub === "xem") {
			const p1 = args[1];
			const p2 = args[2];

			if (!p1) {
				return "[Note] Cú pháp: !note view <chủ sở hữu> <số thứ tự> HOẶC !note view <số thứ tự>. Ví dụ: !note view MoonVN 1";
			}

			// If only 1 param, check if it's viewing own note
			if (!p2) {
				const res = await NoteService.viewSharedNote(serverHost, sender, sender, p1);
				return res.success ? `[Note #${p1}] ${res.note?.content}` : `[Note] ${res.message}`;
			}

			// 2 params: view <owner> <id>
			const res = await NoteService.viewSharedNote(serverHost, sender, p1, p2);
			return res.success ? res.message : `[Note] ${res.message}`;
		}

		if (sub === "del" || sub === "xoa" || sub === "delete") {
			const target = args[1];
			if (!target) {
				return "[Note] Cú pháp: !note del <số thứ tự>. Ví dụ: !note del 1";
			}
			const res = await NoteService.deleteNote(serverHost, sender, target);
			return `[Note] ${res.message}`;
		}

		if (sub === "clear" || sub === "xoatatca") {
			const res = await NoteService.clearNotes(serverHost, sender);
			return `[Note] Đã xóa toàn bộ ${res.count} ghi chú của bạn.`;
		}

		// Fallback: If user directly typed !note <content> without sub-action
		const content = args.join(" ");
		const res = await NoteService.addNote(serverHost, sender, sender, content);
		return `[Note] ${res.message}`;
	}
}
