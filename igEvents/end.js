const { sendGlobalChat } = require('../functions/minecraft.js');

module.exports = {
    name: 'end',
    
    async execute (bot, reason) {
        console.log(reason);
        sendGlobalChat(bot, reason);
        console.log("Bot đã mất kết nối");

        if(reason == 'force') create();
        else setTimeout(create,  3 * 60 * 1000);

        function create() {
            require('../bot.js').createBot();
        }

        if(!bot.data.logged) return;
        
        bot.data.logged = false;
    }
}
