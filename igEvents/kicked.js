const { sendGlobalChat } = require("../functions/minecraft");

module.exports = {
    name: 'kicked',
    
    execute (bot, reason, loggedIn) {
        if(reason.toString().includes("Kết nối 2")) bot.data.fastReconnect = true;
        if(reason.toString().includes("Kết nối 1")) bot.data.fastReconnect = true;
        if(reason.toString().includes("As this is your first time playing")) bot.data.fastReconnect = true;
        
        console.log(reason, loggedIn);
        sendGlobalChat(bot, reason);
    }
}
