const { Client, Message } = require('discord.js');

module.exports = {
    name: 'eval',
    description: 'Thực thi code không cần phải edit và run bot',
    dev: true,

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        if (!args[0]) return message.sendMessage('Cung cấp 1 đoạn code.');
        try {
            await eval(args.join(" "));
            message.sendMessage("Thực thi thành công!");
        } catch (e) {
            message.sendMessage('**Lỗi:** ' + e.message);
        }
    }
}