const { sendGlobalChat } = require("../functions/minecraft");

module.exports = {
    name: 'kicked',
    
    execute (bot, reason, loggedIn) {
        console.log(reason, loggedIn);
        sendGlobalChat(bot, reason);
    }
}
