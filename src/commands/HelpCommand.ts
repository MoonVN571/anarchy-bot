import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { CommandManager } from "./CommandManager";
import { messageColors } from "../utils/chatParser";

export class HelpCommand extends Command {
	private manager: CommandManager;

	constructor(manager: CommandManager) {
		super({
			name: "help",
			aliases: ["h", "commands", "trogiup"],
			description: "Xem danh sách các lệnh livechat Discord và trong game",
			usage: ">help [tên_lệnh]",
			inGameUsage: "!help",
		});
		this.manager = manager;
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args } = ctx;
		const query = args[0]?.toLowerCase();

		if (query) {
			const cmd = this.manager.getCommand(query);
			if (!cmd) {
				await message.reply({ content: `Không tìm thấy lệnh \`>${query}\`.` });
				return;
			}

			const aliasStr = cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`>${a}\``).join(", ") : "Không có";
			const container = new ContainerBuilder()
				.setAccentColor(messageColors.server)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Chi Tiết Lệnh: >${cmd.name}**\n\n` +
						`- **Mô tả:** ${cmd.description}\n` +
						`- **Cú pháp Discord:** \`${cmd.usage}\`\n` +
						`- **Cú pháp In-game:** \`${cmd.inGameUsage}\`\n` +
						`- **Aliases:** ${aliasStr}`
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

		const container = new ContainerBuilder()
			.setAccentColor(messageColors.achievement)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"**Bảng Lệnh Bot (Discord: Prefix `>` | In-game: Prefix `!`)**\n\n" +
					"📊 **Thống Kê & Xếp Hạng:**\n" +
					"- `>kd [player]` (In-game: `!kd`) — Xem tỉ lệ hạ gục K/D & Killstreak\n" +
					"- `>stats [player]` (In-game: `!stats`) — Thống kê tổng hợp toàn diện người chơi\n" +
					"- `>top <playtime|kills|deaths|messages>` (In-game: `!top`) — Bảng xếp hạng server\n" +
					"- `>playtime [player]` (In-game: `!playtime`) — Xem thời gian online tích lũy\n" +
					"- `>quote [player]` (In-game: `!quote`) — Trích dẫn câu chat ngẫu nhiên\n" +
					"- `>online` (In-game: `!online`) — Danh sách người chơi đang online\n\n" +
					"🔍 **Tra Cứu Thông Tin & Lịch Sử:**\n" +
					"- `>jd [player]` (In-game: `!jd`) — Ngày đầu tiên người chơi vào server\n" +
					"- `>seen [player]` (In-game: `!seen`) — Trạng thái online hoặc lần cuối nhìn thấy\n" +
					"- `>fm [player]` (In-game: `!fm`) — Tra cứu câu tin nhắn đầu tiên\n" +
					"- `>lm [player]` (In-game: `!lm`) — Tra cứu câu tin nhắn gần nhất\n\n" +
					"🛠️ **Tiện Ích & Hệ Thống:**\n" +
					"- `>discord` (In-game: `!discord`) — Link tham gia máy chủ Discord của Bot\n" +
					"- `>kill` (In-game: `!kill`) — Bot tự sát /kill giải cứu khi kẹt bẫy (Cooldown 60s)\n" +
					"- `>ping` (In-game: `!ping`) — Đo độ trễ mạng và thời gian uptime bot\n" +
					"- `>tps` (In-game: `!tps`) — Đo tốc độ xử lý TPS & độ mượt server\n" +
					"- `>pos` (In-game: `!pos`) — Tọa độ hiện tại của bot\n" +
					"- `>tab` (In-game: `!tab`) — Header & Footer Tablist server\n" +
					"- `>status` (In-game: `!status`) — Trạng thái kết nối bot"
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`Dùng >help <lệnh> để xem chi tiết | <t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string[] | void> {
		return [
			"[Help - Thống kê] !kd, !stats, !top, !playtime, !quote, !online",
			"[Help - Tra cứu] !jd, !seen, !fm, !lm",
			"[Help - Tiện ích] !discord, !kill, !ping, !tps, !pos, !tab, !status",
		];
	}
}
