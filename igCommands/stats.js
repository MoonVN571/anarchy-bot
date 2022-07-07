const { Bot } = require('mineflayer');
const kd = require('../db/stats');
const {  } = require('../functions/minecraft');

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
        if(!kdData) kd.create({username:name,kills:0,deaths:0});


        let kills = kdData?.kills || 0;
        let deaths= kdData?.deaths || 0;
        let kda = kills/deaths || 0.00;

        bot.sendMessage('whisper', name+' | Kills: ' + kills + " - Deaths: " + deaths + " K/D: " + kda.toFixed(2));
    }
}
