const { sendGlobalChat } = require('../functions/minecraft');
const { solveAlotMessage } = require('../functions/minecraft/mcUtils');
const { log } = require('../functions/utils');
require('dotenv').config();

module.exports = {
    name: 'message',

    /**
     * 
     * @param {} bot 
     * @param {String} msg 
     */
    execute(bot, msg) {
        let content = msg.toString();

        let pw = `${process.env.PIN}${process.env.PIN}`;
        if (content == '[Server] Chào bạn, bạn cần tạo tài khoản trước khi chơi. Cú pháp: /reg [Mật Khẩu] [Nhập Lại MK]') bot.chat(`/reg ${pw} ${pw}`);
        if(content == '[Server] Chào bạn, vui lòng đăng nhập: /l [Mật Khẩu]') bot.chat('/l ' + pw);
        if(content == '[Server] Đăng nhập thành công! /2b2c để vào server') bot.chat('/2b2c');

        let username;
        let message;

        // log(content);

        if (content.startsWith('<')) {
            let parse = content;
            if (content.startsWith("<[")) parse = content.replace("[Donator] ", "")
            if (parse.split(">")[0]?.includes("~")) parse = parse.replace("~", "");
            parse = parse.replace("<", "").replace('>', '');
            username = parse.split(' ')[0];
            message = parse.split(' ').slice(1).join(" ");
            // log(`${username} : ${message}`);
        }

        sendGlobalChat(bot, content, username, message);

        if (!username || !message) return;

        /**
         *        COMMAND
         */

        if (!message.startsWith(bot.config.minecraftPrefix)) return;

        let args = message.trim().toLowerCase().slice(bot.config.minecraftPrefix.length).split(/ +/g);
        let cmdName = args.shift();

        const cmd = bot.commands.get(cmdName) || bot.commands.find(cmd => cmd.aliases?.indexOf(cmdName) > -1);

        if (!cmd) return;

        log('[2B2C-INGAME] ' + username + ' used command: ' + cmdName + ' ' + args.join(" "));

        bot.sendMessage = (type, message) => sendMessage(bot, type, message);
        function sendMessage(bot, type, message) {
            if (type == 'whisper') {
                bot.data.arrayMessages.push(`/msg ${username} ${message}`);
                solveAlotMessage(bot);
            }
        }

        if (cmd.dev && bot.adminName.indexOf(username) < 0) return;

        cmd.execute(bot, username, args);
    }
}
