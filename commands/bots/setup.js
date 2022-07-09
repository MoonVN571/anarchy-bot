const { Client, Message } = require('discord.js');
const db = require('../../db/setup');

module.exports = {
    name: 'setup',
    description: 'Setup dữ liệu xuất từ server',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     * @returns 
     */
    async execute(client, message, args) {
        if (!message.guild.members.cache.get(message.author.id).permissions.has('ADMINISTRATOR'))
            return message.sendMessage("Bạn không có thẩm quyền để dùng lệnh này!");

        if (!args[0]) return message.sendMessage('Cung cấp loại setting. (livechat/command)');
        if (!args[1]) return message.sendMessage('Cung cấp ID channel hoặc tag kênh để setup.');

        let serverData = await db.findOne({ guildId: message.guildId });
        if (!serverData) await db.create({ guildId: message.guildId, livechat: undefined, command: undefined });

        switch (args[0]) {
            case 'livechat': {
                if (serverData.livechat) return message.sendMessage(
                    "Đã setup `livechat` tại server này!" +
                    "\nSử dụng `" + message.prefix + "setup delete livechat` xoá setting."
                );

                let setup = setupServer('livechat', client, message, args);

                if (!setup.error) {
                    serverData.type = setup.channelId;
                    await serverData.save();
                    message.sendMessage('Đã setup `livechat` tại <#' + setup.channelId + ">");
                } else {
                    message.sendMessage(setup.error);
                }
            }
                break;

            case 'command': {
                if (serverData.command) return message.sendMessage(
                    "Đã setup `command` tại server này!" +
                    "\nSử dụng `" + message.prefix + "setup delete command` xoá setting."
                );

                let setup = setupServer(client, message, args);

                if (!setup.error) {
                    serverData.type = setup.channelId;
                    await serverData.save();
                    message.sendMessage('Đã setup `command` tại <#' + setup.channelId + ">");
                } else {
                    message.sendMessage(setup.error);
                }
            }
                break;

            case 'delete': {
                switch (args[1]) {
                    case 'livechat': {
                        serverData.livechat = undefined;
                        serverData.save();

                        message.sendMessage('Đã loại bỏ setting `livechat` của server.');
                    }
                        break;
                    case 'command': {
                        serverData.command = undefined;
                        serverData.save();

                        message.sendMessage('Đã loại bỏ setting `command` của server.');
                    }
                        break;

                    default:
                        return message.sendMessage("Không tìm thấy setting này (livechat/command)");
                }
            }
            default:
                return message.sendMessage('Không tìm thấy setting này (livechat/delete)');
        }
    }
}

function setupServer(client, message, args) {
    let channel = isValidChannel(client, message, args[1]);
    if (!channel) return "Kênh không hợp lệ.";

    let guildChannel = message.guild.channels.cache.get(channel);
    if (!message.guild.me.permissionsIn(guildChannel).has('SEND_MESSAGES'))
        return { error: 'Bot không thể gửi tin nhắn trong kênh này!' };
    else return { channelId: channel };
}



function isValidChannel(client, message, data) {
    if (!isNaN(data)) channel = client.channels.cache.get(data)?.id;
    else channel = message.mentions.channels.first()?.id;
    return channel;
}