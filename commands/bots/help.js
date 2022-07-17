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
        if (args[0]) {
            let cmd = client.commands.get(args[0])
                || client.commands.find(cmd => cmd.aliases && cmd.aliases.indexOf(args[0]) > -1);

            if (cmd && (!cmd.dev || !cmd.disable) && cmd.description) return message.sendMessage(`**${args[0]}**: *${cmd.description}*`);   
        }

        let botCmd = [];
        let igCmdList = readdirSync('./igCommands/')
            .map(cmdName => cmdName.split(".js")[0])
            .filter(cmdName => !require('../../igCommands/' + cmdName)?.dev);

        readdirSync('./commands').forEach(category => {
            if (category == 'admin') return;

            let cmdList = readdirSync('./commands/' + category)
                .map(cmdName => cmdName.split(".js")[0])
                .filter(cmdName => {
                    let cmd = require('../../commands/' + category + '/' + cmdName);
                    if (cmd.dev || cmd.disable) return false;
                    else return true;
                });

            botCmd.push('***' + category + '***: `' + cmdList.join('`, `') + '`');
        });

        let igCmd = '`' + igCmdList.join('`, `') + '`';

        message.sendMessage(
            '**Discord Commands**' + '\n\n'
            + botCmd.join('\n')
            + '\n\n'
            + '**Ingame Commands**' + '\n\n'
            + igCmd
            + '\n\n'
            + 'Các lệnh tại mục **players** chỉ check stats của player 2Y2C'
            + '\n\n'
            + '*Mẹo: Sử dụng `' + message.prefix + 'help <tên lệnh>` để xem thêm mô tả.*'
        );
    }
}