import {
	ButtonInteraction,
	ContainerBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { Discord } from "../../../structures";

export async function handleClassifyDismiss(_client: Discord, interaction: ButtonInteraction): Promise<void> {
	await interaction.deferUpdate();

	const container = new ContainerBuilder()
		.setAccentColor(0x808080)
		.addTextDisplayComponents(
			new TextDisplayBuilder().setContent(
				`**Đã Bỏ Qua Tin Nhắn**\n` +
				`*Đã bỏ qua bởi @${interaction.user.username}*`
			)
		);

	await interaction.editReply({
		components: [container],
	});
}
