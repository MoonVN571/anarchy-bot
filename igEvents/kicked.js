const { sendGlobalChat } = require("../functions/minecraft");

module.exports = {
    name: 'kicked',
    
    execute (bot, reason, loggedIn) {
        sendGlobalChat(bot, reason);
        //if(reason.toString().includes("Reconnect 2 more times to enter!")) require('../bot').createBot();
        //if(reason.toString().includes("Reconnect 1 more times to enter!")) require('../bot').createBot();
        console.log(reason, loggedIn);
    }
}
