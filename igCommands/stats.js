const { Bot } = require('mineflayer');
const kd = require('../db/stats');
const { log } = require('../functions/utils');

module.exports = {
    name: 'stats',
    aliases: ['kd'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;

        let kdData = await kd.findOne({'$regex':'^'+name+'$'});
        
        log(kdData, await kd.findOne({username:name}));
        
        if(!kdData) return bot.sendMessage('whisper', 'Không tìm thấy người chơi');

        let kills = kdData?.kills || 0;
        let deaths= kdData?.deaths || 0;
        let kda = kills/deaths || 0.00;

        bot.sendMessage('whisper', name+' - Kills: ' + kills + " - Deaths: " + deaths + " K/D: " + kda.toFixed(2));
    }
}
