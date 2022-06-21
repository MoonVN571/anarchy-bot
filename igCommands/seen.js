const { Bot } = require('mineflayer');
const seen = require('../db/seen');
const {  } = require('../functions/minecraft');
const { getDorHMS, legitNumber } = require('../functions/utils');

module.exports = {
    name: 'seen',
    aliases: ['see', 'lastseen', 'ls'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;
        
        let res = /^[a-zA-Z]+$/.test(name);
        if(!res) name = username;

        let seenData = await seen.findOne({username:name});
        if(!seenData) return bot.sendMessage('whisper', bot.notFoundPlayers);
        
        let date = new Date(seenData.time);

        bot.sendMessage('whisper', name+' : '
        + legitNumber(date.getDate(),2)
        + '.' + legitNumber(date.getMonth()-1,2)
        + '.' + date.getFullYear() + ' - '
        + legitNumber(getDorHMS((Date.now()-seenData.time)/1000, true))
        + ' trước');
    }
}