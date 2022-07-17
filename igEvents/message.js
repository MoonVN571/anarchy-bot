const { sendGlobalChat } = require('../functions/minecraft');
const { solveAlotMessage } = require('../functions/botFunc');
const { log } = require('../functions/utils');

module.exports = {
    name: 'message',

    /**
     * 
     * @param {} bot 
     * @param {String} msg 
     */
    execute(bot, msg) {
        let content = msg.toString();

        // Credit to vaitosoi
        if (content.startsWith(' dùng lệnh/2y2c')) bot.chat('/2y2c');

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

        log('[2Y2C-INGAME] ' + username + ' used command: ' + cmdName + ' ' + args.join(" "));

        bot.sendMessage = (type, message) => sendMessage(bot, type, message);
        function sendMessage(bot, type, message) {
            if (type == 'whisper') {
                bot.arrayMessages.push(`/msg ${username} ${message}`);
                solveAlotMessage(bot);
            }
        }

        if (cmd.dev && bot.adminName.indexOf(username) < 0) return;

        cmd.execute(bot, username, args);
    }
}
