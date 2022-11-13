const { sendGlobalChat } = require('../functions/minecraft');
const { solveAlotMessage } = require('../functions/minecraft/mcUtils');
const { log } = require('../functions/utils');
const setting = require('../setting');
module.exports = {
    name: 'message',
    execute(bot, msg) {
        let content = msg.toString();
        if (!content) return;
        if (setting.authType == 'AdvancedLogin'
            && content == setting.joinCmdMessage) bot.chat(setting.joinCmd);
        let psw = `${process.env.PIN}${process.env.PIN}`;
        if (setting.authType == 'AuthMe') {
            if (setting.authMe.msg.register == content) bot.chat(`/register ${psw} ${psw}`);
            if (setting.authMe.msg.login == content) bot.chat(`/login ${psw}`);
            if (setting.authMe.msg.success.indexOf(content) > -1) bot.chat(setting.joinCmd);
        }
        let username;
        let message;
        if (content.startsWith('<')) {
            let parse = content;
            if (content.startsWith("<[")) parse = content.replace("[Donator] ", "")
            if (parse.split(">")[0]?.includes("~")) parse = parse.replace("~", "");
            parse = parse.replace("<", "").replace('>', '');
            username = parse.split(' ')[0];
            message = parse.split(' ').slice(1).join(" ");
        }
        sendGlobalChat(bot, content, username, message);
        if (!username || !message) return;
        if (!message.startsWith(bot.config.minecraftPrefix)) return;
        let args = message.trim().slice(bot.config.minecraftPrefix.length).split(/ +/g);
        let cmdName = args.shift();
        const cmd = bot.commands.get(cmdName)
            || bot.commands.find(cmd => cmd.aliases?.indexOf(cmdName) > -1);
        if (!cmd) return;
        log(`[${bot.config.serverName}-INGAME] ${username} used command: ${cmdName} ${args.join(" ")}`);
        bot.sendMessage = (type, message) => sendMessage(bot, type, message);
        function sendMessage(bot, type, message) {
            if (type == 'whisper') {
                bot.data.arrayMessages.push(`/msg ${username} ${message}`);
                solveAlotMessage(bot);
            }
        }
        if (cmd.dev && bot.adminName.indexOf(username) < 0) return;
        cmd.executeIngame(bot, username, args);
    }
}
