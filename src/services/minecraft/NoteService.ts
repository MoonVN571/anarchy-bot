import { NoteModel, INote } from "../../database/models/NoteModel";
import { CoordinateFilter } from "../../utils/minecraft/coordinateFilter";

export class NoteService {
	public static readonly MAX_NOTES_PER_PLAYER = 20;

	/**
	 * Add a note for a player
	 */
	public static async addNote(
		server: string,
		username: string,
		displayName: string,
		content: string
	): Promise<{ success: boolean; message: string; note?: INote; hasCoords?: boolean }> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();
		const trimmedContent = content.trim();

		if (!trimmedContent) {
			return { success: false, message: "Nội dung ghi chú không được để trống!" };
		}

		const count = await NoteModel.countDocuments({ server: s, username: u });
		if (count >= this.MAX_NOTES_PER_PLAYER) {
			return {
				success: false,
				message: `Bạn chỉ có thể lưu tối đa ${this.MAX_NOTES_PER_PLAYER} ghi chú. Dùng !note del <số> để xóa bớt.`,
			};
		}

		const hasCoords = CoordinateFilter.hasCoordinates(trimmedContent);

		const note = await NoteModel.create({
			server: s,
			username: u,
			displayName,
			content: trimmedContent,
			hasCoords,
			sharedWith: [],
		});

		const coordNotice = hasCoords ? " (Đã phát hiện và bảo mật tọa độ trên LiveChat)" : "";

		return {
			success: true,
			message: `Đã lưu ghi chú #${count + 1} thành công!${coordNotice}`,
			note,
			hasCoords,
		};
	}

	/**
	 * Get all notes for a player
	 */
	public static async getNotes(server: string, username: string): Promise<INote[]> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();
		return NoteModel.find({ server: s, username: u }).sort({ createdAt: 1 }).exec();
	}

	/**
	 * Get note by index (1-based) or Mongo ID
	 */
	public static async getNote(server: string, username: string, indexOrId: string): Promise<INote | null> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();

		const index = parseInt(indexOrId, 10);
		if (!isNaN(index) && index > 0) {
			const allNotes = await this.getNotes(server, username);
			if (index <= allNotes.length) {
				return allNotes[index - 1];
			}
			return null;
		}

		return NoteModel.findOne({ _id: indexOrId, server: s, username: u });
	}

	/**
	 * Share a note with other players (whitelist)
	 */
	public static async shareNote(
		server: string,
		ownerUsername: string,
		indexOrId: string,
		targetPlayers: string[]
	): Promise<{ success: boolean; message: string; sharedWith?: string[] }> {
		const s = server.toLowerCase().trim();
		const owner = ownerUsername.toLowerCase().trim();

		const note = await this.getNote(s, owner, indexOrId);
		if (!note) {
			return { success: false, message: `Không tìm thấy ghi chú "${indexOrId}" của bạn!` };
		}

		const cleanTargets = targetPlayers
			.map(p => p.toLowerCase().trim())
			.filter(p => p && p !== owner);

		if (cleanTargets.length === 0) {
			return { success: false, message: "Vui lòng chỉ định ít nhất 1 người chơi để chia sẻ!" };
		}

		const currentShared = new Set(note.sharedWith || []);
		for (const target of cleanTargets) {
			currentShared.add(target);
		}

		note.sharedWith = Array.from(currentShared);
		await note.save();

		return {
			success: true,
			message: `Đã chia sẻ ghi chú thành công cho: ${note.sharedWith.join(", ")}.`,
			sharedWith: note.sharedWith,
		};
	}

	/**
	 * Revoke access to a note for a player
	 */
	public static async unshareNote(
		server: string,
		ownerUsername: string,
		indexOrId: string,
		targetPlayer: string
	): Promise<{ success: boolean; message: string }> {
		const s = server.toLowerCase().trim();
		const owner = ownerUsername.toLowerCase().trim();
		const target = targetPlayer.toLowerCase().trim();

		const note = await this.getNote(s, owner, indexOrId);
		if (!note) {
			return { success: false, message: `Không tìm thấy ghi chú "${indexOrId}" của bạn!` };
		}

		if (!note.sharedWith || !note.sharedWith.includes(target)) {
			return { success: false, message: `Ghi chú này chưa từng chia sẻ cho "${targetPlayer}".` };
		}

		note.sharedWith = note.sharedWith.filter(p => p !== target);
		await note.save();

		return {
			success: true,
			message: `Đã thu hồi quyền xem ghi chú đối với người chơi "${targetPlayer}".`,
		};
	}

	/**
	 * Get all notes shared with a player by other players
	 */
	public static async getSharedNotes(server: string, username: string): Promise<INote[]> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();
		return NoteModel.find({ server: s, sharedWith: u }).sort({ createdAt: -1 }).exec();
	}

	/**
	 * View a shared note from another player
	 */
	public static async viewSharedNote(
		server: string,
		requestingUsername: string,
		ownerUsername: string,
		indexOrId: string
	): Promise<{ success: boolean; message: string; note?: INote }> {
		const s = server.toLowerCase().trim();
		const reqUser = requestingUsername.toLowerCase().trim();
		const owner = ownerUsername.toLowerCase().trim();

		const note = await this.getNote(s, owner, indexOrId);
		if (!note) {
			return { success: false, message: `Không tìm thấy ghi chú "${indexOrId}" của ${ownerUsername}!` };
		}

		const isOwner = note.username === reqUser;
		const isShared = (note.sharedWith || []).includes(reqUser);

		if (!isOwner && !isShared) {
			return {
				success: false,
				message: `Bạn không có quyền xem ghi chú này của ${ownerUsername} (Chưa được whitelist)!`,
			};
		}

		return {
			success: true,
			message: `[Note từ ${note.displayName || note.username}]: ${note.content}`,
			note,
		};
	}

	/**
	 * Delete a note by 1-based index or mongo ID
	 */
	public static async deleteNote(
		server: string,
		username: string,
		indexOrId: string
	): Promise<{ success: boolean; message: string }> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();

		const index = parseInt(indexOrId, 10);
		if (!isNaN(index) && index > 0) {
			const allNotes = await this.getNotes(server, username);
			if (index <= allNotes.length) {
				const targetNote = allNotes[index - 1];
				await NoteModel.findByIdAndDelete(targetNote._id);
				return { success: true, message: `Đã xóa ghi chú #${index}.` };
			}
			return { success: false, message: `Không tìm thấy ghi chú số #${index}!` };
		}

		const deleted = await NoteModel.findOneAndDelete({ _id: indexOrId, server: s, username: u });
		if (!deleted) {
			return { success: false, message: "Không tìm thấy ghi chú cần xóa!" };
		}

		return { success: true, message: "Đã xóa ghi chú thành công." };
	}

	/**
	 * Clear all notes for a player
	 */
	public static async clearNotes(server: string, username: string): Promise<{ success: boolean; count: number }> {
		const s = server.toLowerCase().trim();
		const u = username.toLowerCase().trim();
		const res = await NoteModel.deleteMany({ server: s, username: u });
		return { success: true, count: res.deletedCount || 0 };
	}
}
