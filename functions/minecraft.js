const { client } = require('../discord');
const globalChannel = require('../bot').channel;
const stats = require('./minecraft/stats');
const { log, getDorHMS } = require('./utils');

const livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    dead: 0xDB2D2D,
    system: 0xb60000,
    whisper: 0xFD00FF,
    chatbot: 0x4983e7,
    queue: 0xFFC214
}

async function sendGlobalChat(bot, content, username, message) {
    let userChat = `**<${username}>** ${message}`;
    let color = livechat_color.default;

    if (!username) {
        color = livechat_color.system;
        userChat = content;
    }

    if (stats.isDeathMessage(content)) color = livechat_color.dead;
    if (color == livechat_color.dead) stats.save(bot, content);

    if (username == bot.config.botName) color = livechat_color.chatbot;
    if (message?.startsWith(">")) color = livechat_color.highlight;

    if (content?.toLowerCase().startsWith('vị trí của bạn')) color = livechat_color.queue;
    if (content?.toLowerCase().startsWith('vị trí hàng chờ')) return;

    if (content?.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    if (!isNaN(userChat)) return;

    let embed = {
        description: userChat,
        color: color,
        timestamp: new Date().toISOString()
    };

    if ((!content.includes("has made the advancement") && !content.includes("has complete")
        && !content.includes("has reached") && color == livechat_color.system)
    ) sendMessage(globalChannel.server, { embeds: [embed] })

    if (color == livechat_color.whisper) log(content);

    sendMessage(globalChannel.livechat, { embeds: [embed] });
}

function sendMessage(channelId, msg) {
    client.channels.cache.get(channelId).send(msg).catch(err => console.log(err));
}

function getUptime(bot) {
    if (!bot.data.uptime) return '';
    return getDorHMS((Date.now() - bot.data.uptime) / 1000);
}

module.exports = {
    sendGlobalChat,
    getUptime
}
