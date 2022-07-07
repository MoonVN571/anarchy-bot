const { Bot } = require('mineflayer');
const pt = require('../db/playtime');
const {  } = require('../functions/minecraft');
const { getDorHMS } = require('../functions/utils');

module.exports = {
    name: 'playtime',
    aliases: ['pt'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;

        let ptData = await pt.findOne({'$regex':'^'+name+'$'});
        if(!ptData) return bot.sendMessage('whisper', bot.notFoundPlayers);
        
        bot.sendMessage('whisper', name+' : ' 
        + getDorHMS(ptData.time/1000, true, true));
    }
}