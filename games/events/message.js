const { sendGlobalChat } = require('../functions/chat');
const { solveAlotMessage, isOnline } = require('../functions/mcUtils');
const { log } = require('../../functions/utils');
const msgs = require('../../databases/msgs');
module.exports = {
    name: 'message',
    execute(bot, msg) {
        const content = msg.toString();
        if (!content) return;
        const setting = bot.setting;
        if (setting.authType == 'AdvancedLogin' && content == setting.advancedLogin.joinCmdMessage)
            bot.chat(setting.advancedLogin.joinCmd);
        const psw = `${process.env.PIN}${process.env.PIN}`;
        if (setting.authType == 'AuthMe') {
            if (setting.authMe.msg.register == content) bot.chat(`/register ${psw} ${psw}`);
            if (setting.authMe.msg.login == content) bot.chat(`/login ${psw}`);
            if (setting.authMe.msg.success.indexOf(content) > -1) bot.chat(setting.joinCmd);
        }
        let username;
        let message;
        if (content.startsWith('<')) {
            let msgArr = content.split(' ');
            let firstMsg = msgArr[0];
            let lastMsg = content;
            // replace rank
            if (firstMsg.startsWith("<[")) lastMsg = content.split(" ")[0].split("]")[1] + msgArr.slice(1).join(' ');
            // replace <>
            username = lastMsg.split(' ')[0]?.replace(/\<|\>|\~|\:/g, '');
            message = lastMsg.split(' ').slice(1).join(" ");
        }
        sendGlobalChat(bot, content, username, message);
        if (!username || !message) return;
        saveMessage(bot, username, message);
        if (!message.startsWith(bot.setting.gamePrefix)) return;
        let args = message.trim().slice(bot.setting.gamePrefix.length).split(/ +/g);
        const cmdName = args.shift();
        const cmd = bot.client.commands.get(cmdName)
            || bot.client.commands.find(cmd => cmd.aliases?.indexOf(cmdName) > -1);
        if (!cmd || cmd.discordOnly) return;
        log(`${username} : ${message}`);
        bot.sendMessage = (type, message) => {
            if (type == 'whisper') {
                bot.data.arrayMessages.push(`/msg ${username} ${message.trim()}`);
                solveAlotMessage(bot);
            }
        }
        cmd.execute(bot, username, args);
    }
}

async function saveMessage(bot, username, message) {
    if (!username || !message) return;
    if (!isOnline(bot, username)) return;
    db = await msgs.findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (!db) db = await msgs.create({ username: username });
    if (!db.first_messages?.msg) db['first_messages'] = {
        msg: message,
        time: Date.now()
    };
    db['last_messages'] = {
        msg: message,
        time: Date.now()
    }
    await db.save();
}