const { Colors } = require('discord.js');
const { client } = require('../discord');
const globalChannel = require('../bot').channel;
const stats = require('./minecraft/stats');
const { log, getDorHMS } = require('./utils');

const livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    system: 0xb60000,
    whisper: 0xFD00FF,
    queue: 0xFFC214,
    dead: 0xDB2D2D,
    achievement: 0x7DF9FF,
    chatbot: 0x4983e7,
    join: Colors.Green, // djs color
    quit: Colors.Red
}

async function sendGlobalChat(bot, content, username, message) {
    let userChat = `**<${username}>** ${message}`;
    let color = getColor(bot, content, username, message);

    if (!username) userChat = content;

    if (color == livechat_color.dead) stats.save(bot, content);

    if (!isNaN(userChat)) return;

    let embed = {
        description: userChat,
        color: color,
        timestamp: new Date().toISOString()
    };

    if (color == livechat_color.system
        && content !== 'Nếu bạn yêu thích server anarchyvn.net thì đừng quên vote tại đây https://minecraft-mp.com/server/307961/vote/'
        && content !== 'Nếu bạn yêu thích server anarchyvn.net thì đừng quên vote tại đây http://topminecraftservers.org/vote/28848'
        && content.endsWith(" left the game")
        && content.endsWith(" joined the game")) {
        sendMessage(globalChannel.server, { embeds: [embed] });
    }
    if (color == livechat_color.whisper) log(content);

    sendMessage(globalChannel.livechat, { embeds: [embed] });
}

function getColor(bot, content, username, message) {
    let color = livechat_color.default;

    if (!username) color = livechat_color.system;

    if (stats.isDeathMessage(content)) color = livechat_color.dead;

    if (username == bot.config.botName) color = livechat_color.chatbot;
    if (message?.startsWith(">")) color = livechat_color.highlight;

    if (content?.toLowerCase().startsWith('vị trí của bạn')) color = livechat_color.queue;
    if (content?.toLowerCase().startsWith('vị trí hàng chờ')) return;

    if (content?.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    if (color == livechat_color.system && content.endsWith("đã tham gia vào server.")) color = livechat_color.join;
    if (color == livechat_color.system && content.endsWith("đã thoát khỏi server.")) color = livechat_color.quit;

    if (color == livechat_color.system &&
        (content.includes("has made the advancement")
            || content.includes("has complete")
            || content.includes("has reached"))
    ) color = livechat_color.achievement;

    return color;
}

function sendMessage(channelId, msg) {
    client.channels.cache.get(channelId).send(msg).catch(err => console.log(err));
}

function getUptime(bot) {
    if (!bot.data.uptime) return '';
    return getDorHMS((Date.now() - bot.data.uptime) / 1000);
}

function callBot(tick) {
    setTimeout(() => require('../bot').createBot(), (tick || 0));
}

module.exports = {
    sendGlobalChat,
    getUptime,
    callBot
}
