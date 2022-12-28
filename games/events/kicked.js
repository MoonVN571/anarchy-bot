const { sendGlobalChat } = require("../../functions/minecraft/chat");
const { log } = require("../../functions/utils");
module.exports = {
    name: 'kicked',
    execute(bot, reason, loggedIn) {
        if (reason.toString().includes("As this is your first time playing")) bot.data.fastReconnect = true;
        log(reason, loggedIn);
        let msg = '';
        try {
            msg = JSON.parse(reason);
            msg = msg.text;
        } catch {
            msg = reason;
        }
        sendGlobalChat(bot, msg);
    }
}
