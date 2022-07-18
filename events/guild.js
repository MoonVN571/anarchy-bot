const { log } = require('../functions/utils');
const client = require('../discord').client;

client.on('guildCreate', guild => {
    log("Đã tham gia **" + guild.name + "**, đây là server thứ **" + (client.guilds.cache.size + 1) + "**.");
});


client.on('guildDelete', guild => {
    log("Đã thoát khỏi **" + guild.name + "**, còn lại **" + (client.guilds.cache.size - 1) + "** server.");
});