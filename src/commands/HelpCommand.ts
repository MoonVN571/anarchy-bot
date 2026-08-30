import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { CommandManager } from "./CommandManager";

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
		const { message, args, serverHost } = ctx;
		const query = args[0]?.toLowerCase();

		if (query) {
			const cmd = this.manager.getCommand(query);
			if (!cmd) {
				await message.reply({ content: `Không tìm thấy lệnh \`>${query}\`.` });
				return;
			}

			const embed = new EmbedBuilder()
				.setColor(0x3498db)
				.setTitle(`Chi tiết Lệnh: >${cmd.name}`)
				.addFields(
					{ name: "Mô tả", value: cmd.description },
					{ name: "Cú pháp Discord", value: `\`${cmd.usage}\`` },
					{ name: "Cú pháp In-game", value: `\`${cmd.inGameUsage}\`` },
					{ name: "Tên gọi khác (Aliases)", value: cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`>${a}\``).join(", ") : "Không có" }
				)
				.setFooter({ text: `Server: ${serverHost}` });

			await message.reply({ embeds: [embed] });
			return;
		}

		const uniqueCommands = this.manager.getAllCommands();
		const lines = uniqueCommands.map(cmd => {
			const aliasStr = cmd.aliases.length > 0 ? ` *(${cmd.aliases.map(a => `>${a}`).join(", ")})*` : "";
			return `• \`${cmd.usage}\`${aliasStr} (In-game: \`${cmd.inGameUsage}\`)\n  └ ${cmd.description}`;
		});

		const embed = new EmbedBuilder()
			.setColor(0x9b59b6)
			.setTitle("Danh Sách Lệnh (Discord: Prefix `>` | In-game: Prefix `!`)")
			.setDescription(
				"Bạn có thể nhập trực tiếp các lệnh này trên kênh livechat Discord hoặc trong game Minecraft:\n\n" +
				lines.join("\n\n")
			)
			.setFooter({ text: `Server: ${serverHost} | Dùng >help <lệnh> để xem chi tiết` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string | void> {
		return `[Commands] !kd [player], !stats [player], !playtime [player], !quote [player], !top [category], !online, !help`;
	}
}
