const { Message } = require('discord.js');

module.exports = {
    name: 'eval',
    description: 'Thực thi code không cần phải edit và run bot',
    admin: true,

    /**
     * 
     * @param {*} client 
     * @param {Message} message 
     * @param {*} args 
     * @returns 
     */
    async execute(client, message, args) {
        if(!args[0]) return message.sendMessage('Cung cấp 1 đoạn code.');
        try {
            await eval(args.join(" "));
            message.sendMessage("Thực thi thành công!");
        } catch(e) {
            message.sendMessage('**Lỗi:** ' + e.message);
        }
    }
}