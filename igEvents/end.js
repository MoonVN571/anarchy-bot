const { sendBotLog, getUptime } = require('../functions/minecraft');
const { setStatus } = require('../functions/botFunc');
const client = require('../discord').client;
const globalChannel = require("../bot").channel;

module.exports = {
    name: 'end',
    
    async execute (bot, reason) {
        console.log(reason);

        let channel = client.channels.cache.get(globalChannel.stats);

        await channel.messages.fetch().then(message => {
            let botMessage = message.map(m => m).filter(m => m.author.id == client.user.id);

            botMessage.forEach(message => {
                message.delete().catch(err => { });
            });
        });

        console.log("Bot đã mất kết nối");
        setStatus('idle', 'Watching', 'chờ kết nối!');

        if(reason == 'force') create();
        else setTimeout(create,  3 * 60 * 1000);

        function create() {
            require('../bot.js').createBot();
        }

        if(!bot.data.logged) return;
        
        sendBotLog('disconnect', `Bot đã mất kết nối đến server. Kết nối lại sau 3 phút.\nThời gian trong server là ${getUptime(bot, true)}`);

        bot.data.logged = false;
        bot.data.uptime = Date.now();
    }
}
