const { sendGlobalChat } = require("../functions/minecraft");
module.exports = {
    name: 'kicked',
    execute(bot, reason, loggedIn) {
        if (reason.toString().includes("Chúng tôi đang kiểm tra kết nối bạn!")) bot.data.fastReconnect = true;
        console.log(reason, loggedIn);
        sendGlobalChat(bot, reason);
    }
}
