import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
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

			const aliasStr = cmd.aliases.length > 0 ? cmd.aliases.map(a => `\`>${a}\``).join(", ") : "Không có";
			const container = new ContainerBuilder()
				.setAccentColor(0x3498db)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Chi tiết Lệnh: >${cmd.name}**\n\n` +
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

		const uniqueCommands = this.manager.getAllCommands();
		const lines = uniqueCommands.map(cmd => {
			const aliasStr = cmd.aliases.length > 0 ? ` *(${cmd.aliases.map(a => `>${a}`).join(", ")})*` : "";
			return `- \`${cmd.usage}\`${aliasStr} (In-game: \`${cmd.inGameUsage}\`)\n  └ ${cmd.description}`;
		});

		const container = new ContainerBuilder()
			.setAccentColor(0x9b59b6)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"**Danh Sách Lệnh (Discord: Prefix `>` | In-game: Prefix `!`)**\n\n" +
					"Bạn có thể nhập trực tiếp các lệnh này trên kênh livechat Discord hoặc trong game Minecraft:\n\n" +
					lines.join("\n\n")
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`Dùng >help <lệnh> để xem chi tiết\n<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string | void> {
		return `[Commands] !kd [player], !stats [player], !playtime [player], !quote [player], !top [category], !online, !help`;
	}
}
