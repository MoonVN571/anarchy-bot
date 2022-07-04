module.exports = {
    name: 'spawn',
    once: false,
    execute (bot) {
        bot.logged = true;
        
        if(bot.player?.gamemode !== 0) return;
        bot.mainServer = true;
        bot.uptime = Date.now();
    }
}