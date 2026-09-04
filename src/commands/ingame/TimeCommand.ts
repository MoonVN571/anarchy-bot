import { Command, CommandContext, InGameCommandContext } from "../../typings";

export class TimeCommand extends Command {
	constructor() {
		super({
			name: "time",
			aliases: ["gio", "thoitiet", "weather"],
			description: "Xem thời gian trong thế giới Minecraft, chu kỳ mặt trăng và thời tiết",
			usage: "!time",
			inGameUsage: "!time",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		// Ingame-only command; if called in Discord, give a short informational reply
		await ctx.message.reply({ content: "[Thông tin] Lệnh !time được tối ưu hiển thị trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const bot = ctx.bot.bot;
		const timeOfDay = bot?.time?.timeOfDay ?? 0;
		const age = bot?.time?.age ?? 0;
		const worldDay = Math.floor(age / 24000);

		// Calculate 24h format
		const totalMinutes = Math.floor(((timeOfDay + 6000) % 24000) / (24000 / (24 * 60)));
		const ingameH = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
		const ingameM = (totalMinutes % 60).toString().padStart(2, "0");
		const timeStr = `${ingameH}:${ingameM}`;

		// Day/Night and Sleep status
		const isNight = timeOfDay >= 13000 && timeOfDay <= 23000;
		let status = "";
		if (isNight) {
			const ticksUntilDay = 24000 - timeOfDay;
			const minsUntilDay = Math.ceil((ticksUntilDay / 20) / 60);
			status = `Trời tối (có thể ngủ) - Khoảng ${minsUntilDay}p nữa trời sáng`;
		} else {
			const ticksUntilNight = 13000 - timeOfDay;
			const minsUntilNight = Math.ceil((ticksUntilNight / 20) / 60);
			status = `Trời sáng - Khoảng ${minsUntilNight}p nữa trời tối`;
		}

		// Moon Phase
		const MOON_PHASES = [
			"Trăng tròn (Full Moon)",
			"Trăng khuyết giảm",
			"Bán nguyệt cuối",
			"Trăng tàn",
			"Trăng non (New Moon)",
			"Trăng non đầu tháng",
			"Bán nguyệt đầu",
			"Trăng khuyết tăng",
		];
		const moonPhase = MOON_PHASES[worldDay % 8] || "Trăng tròn";

		// Weather
		let weather = "Trời quang (Clear)";
		if (bot?.thunderState && bot.thunderState > 0) {
			weather = "Bão sấm sét (Thunderstorm)";
		} else if (bot?.isRaining) {
			weather = "Trời mưa (Raining)";
		}

		return `[Thời Gian] Giờ: ${timeStr} | Ngày: ${worldDay} | ${status} | Mặt trăng: ${moonPhase} | Thời tiết: ${weather}`;
	}
}
