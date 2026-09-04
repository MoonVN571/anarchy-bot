import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";

export class WorkCommand extends Command {
	constructor() {
		super({
			name: "work",
			aliases: ["lamviec", "cuoc", "kiemtien"],
			description: "Làm việc kiếm từ 50 - 250 xu ảo (hồi chiêu 15 phút)",
			usage: "!work",
			inGameUsage: "!work",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !work hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, serverHost } = ctx;
		const res = await EconomyService.work(serverHost, sender, sender);

		if (!res.success) {
			const mins = Math.floor((res.cooldownSeconds || 0) / 60);
			const secs = (res.cooldownSeconds || 0) % 60;
			const timeText = mins > 0 ? `${mins}p ${secs}s` : `${secs}s`;
			return `[Làm Việc] Bạn đang mệt mỏi! Vui lòng nghỉ ngơi thêm ${timeText} nữa rồi hãy quay lại làm việc nhé.`;
		}

		const starterMsg = res.isNewUser
			? ` [Tân thủ: +${EconomyService.INITIAL_STARTER_COINS} xu vốn khởi nghiệp!]`
			: "";

		return `[Làm Việc] ${res.flavorText} ${res.earned} xu! Số dư hiện tại: ${(res.newBalance || 0).toLocaleString("vi-VN")} xu.${starterMsg}`;
	}
}
