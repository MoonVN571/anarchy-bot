const { sendGlobalChat } = require("../functions/minecraft");

module.exports = {
    name: 'kicked',
    
    execute (bot, reason, loggedIn) {
        if(reason.toString().includes("Reconnect 2 more times to enter!")) bot.data.fastReconnect = true;
        if(reason.toString().includes("Reconnect 1 more times to enter!")) bot.data.fastReconnect = true;
        if(reason.toString().includes("As this is your first time playing")) bot.data.fastReconnect = true;
        
        console.log(reason, loggedIn);
        sendGlobalChat(bot, reason);
    }
}
