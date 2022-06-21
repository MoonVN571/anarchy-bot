const { Message } = require('discord.js');
const db = require('../../db/setup');

module.exports = {
    name: 'setup',
    description: 'Setup dữ liệu xuất từ server',

    /**
     * 
     * @param {*} client 
     * @param {Message} message 
     * @param {*} args 
     * @returns 
     */
    async execute(client, message, args) {
        if(!message.guild.members.cache.get(message.author.id).permissions.has('ADMINISTRATOR'))
            return message.sendMessage("Bạn không có thẩm quyền để dùng lệnh này!");

        if(!args[0]) return message.sendMessage('Cung cấp loại setup (livechat).');
        if(!args[1]) return message.sendMessage('Cung cấp ID channel hoặc tag kênh để setup');

        let serverData = await db.findOne({guildId:message.guildId});
        if(!serverData) await db.create({guildId:message.guildId,livechat:undefined});

        switch(args[0]) {
            case 'livechat': {
                if(serverData.livechat) return message.sendMessage("Đã có setup livechat tại server này! Sử dụng ");

                let channel;
                if(!isNaN(args[1])) {
                    channel = client.channels.cache.get(args[1])?.id;
                } else {
                    channel = message.mentions.channels.first()?.id;
                }

                if(!channel) return message.sendMessage("Channel ID hoặc kênh tag không hợp lệ");

                let guildChannel = message.guild.channels.cache.get(channel);
                if(!message.guild.me.permissionsIn(guildChannel).has('SEND_MESSAGES'))
                    return message.sendMessage('Bot không thể gửi tin nhắn trong kênh này!');
                else {
                    serverData.livechat = channel;
                    await serverData.save();
                }

                message.sendMessage('Đã setup livechat tại <#'+channel+">");
            }
            break;

            case 'delete': {
                switch(args[1]) {
                    case 'livechat': {
                        serverData.livechat = undefined;
                        serverData.save();

                        message.sendMessage('Đã loại bỏ livechat của server');
                    }
                    break;

                    default: 
                        return message.sendMessage("Không tìm thấy setting này (livechat)");
                }
            }
            default:
                return message.sendMessage('Không tìm thấy setting này (livechat/delete)');
        }

    }
}