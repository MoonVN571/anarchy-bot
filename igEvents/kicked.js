const { sendGlobalChat } = require("../functions/minecraft");

module.exports = {
    name: 'kicked',
    execute (bot, reason, loggedIn) {
        sendGlobalChat(bot, reason);
        
        console.log(reason, loggedIn);
    }
}
