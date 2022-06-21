const { Bot } = require('mineflayer');
const jd = require('../db/joindate');
const {  } = require('../functions/minecraft');
const { getDorHMS, legitNumber } = require('../functions/utils');

module.exports = {
    name: 'joindate',
    aliases: ['jd', 'date'],

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

        let jdData = await jd.findOne({username:name});
        if(!jdData) return bot.sendMessage('whisper', bot.notFoundPlayers);
        
        let date = new Date(jdData.time)

        console.log(jdData.time, Date.now());

        bot.sendMessage('whisper', name+' : '
        + legitNumber(date.getDate(),2)
        + '.' + legitNumber(date.getMonth()-1,2)
        + '.' + date.getFullYear() + ' - '
        + legitNumber(getDorHMS((Date.now()-jdData.time)/1000, true))
        + ' trước');
    }
}