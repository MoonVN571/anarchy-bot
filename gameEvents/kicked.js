const { sendGlobalChat } = require("../functions/minecraft/chat");
module.exports = {
    name: 'kicked',
    execute(bot, reason, loggedIn) {
        if (reason.toString().includes("Kết nối lại 2")) bot.data.fastReconnect = true;
        if (reason.toString().includes("Kết nối lại 1")) bot.data.fastReconnect = true;
        if (reason.toString().includes("As this is your first time playing")) bot.data.fastReconnect = true;
        console.log(reason, loggedIn);
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
