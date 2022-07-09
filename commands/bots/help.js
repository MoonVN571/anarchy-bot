const { Client, Message } = require('discord.js');
const { readdirSync } = require('fs');

module.exports = {
    name: 'help',
    description: 'Xem lệnh của bot',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        let stage = 0;

        let botCmd = [];
        let igCmdList = readdirSync('./igCommands/')
            .map(cmdName => cmdName.split(".js")[0])
            .filter(cmdName => !require('../../igCommands/' + cmdName)?.dev);

        readdirSync('./commands').forEach(category => {
            if(category == 'admin') return;

            let cmdList = readdirSync('./commands/' + category)
                .map(cmdName => cmdName.split(".js")[0])
                .filter(cmdName => !require('../../commands/' + category + '/' + cmdName)?.dev);

            if (cmdList.indexOf(args[0]) > -1) {
                let cmd = require('../../commands/' + category + '/' + args[0]);

                if (!cmd.description) return message.sendMessage("Lệnh này không có mô tả.");
                else message.sendMessage('**' + args[0] + "**: " + cmd.description);
                return;
            } if (igCmdList.indexOf(args[0]) > -1) {
                let cmd = require('../../igCommands/' + args[0]);

                if (!cmd.description) return message.sendMessage("Lệnh này không có mô tả.");
                else message.sendMessage('**' + args[0] + "**: " + cmd.description);

                return;
            }
            
            stage++;

            botCmd.push('***' + category + '***: `' + cmdList.join('`, `') + '`');
        });

        if (stage > 0 && args[0]) return message.sendMessage("Không tìm thấy lệnh này.");

        let igCmd = '`' + igCmdList.join('`, `') + '`';


        message.sendMessage(
            '**Discord Commands**' + '\n\n'
            + botCmd.join('\n')
            + '\n\n'
            + '**Ingame Commands**' + '\n\n'
            + igCmd
            + '\n\n'
            + '*Mẹo: Sử dụng `' + message.prefix + 'help <tên lệnh>` để xem thêm mô tả.*'
        );
    }
}