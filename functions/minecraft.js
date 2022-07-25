const { EmbedBuilder } = require('@discordjs/builders');
const { Colors } = require('discord.js');
const { client } = require('../discord');
const { getPlayersList } = require('./minecraft/mcUtils');
const globalChannel = require('../bot').channel;
const stats = require('./minecraft/stats');
const { getDorHMS, log } = require('./utils');

const livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    dead: 0xDB2D2D,
    system: 0xb60000,
    whisper: 0xFD00FF,
    chatbot: 0x4983e7,
    queue: 0xFFC214
}

const botlog_color = {
    join_log: 0x15ff00,
    queue_log: 0xeeee00,
    disconnect_log: 0xF71319
}

async function sendGlobalChat(bot, content, username, message) {
    let userChat = `**<${username}>** ${message}`;
    let color = livechat_color.default;

    // Nếu message player = ">" color là xanh
    if (message?.startsWith(">")) color = livechat_color.highlight;

    if (!username) {
        color = livechat_color.system;
        userChat = content;
    }

    // Check nếu tin nhắn là death message
    if (stats.isDeathMessage(content)) color = livechat_color.dead;

    // Lưu lại KD của player nếu không phài dev mode
    if (color == livechat_color.dead) stats.save(bot, content);

    // Tin nhắn được gửi bởi bot
    if (username == bot.config.botName) color = livechat_color.chatbot;

    // Tin nhắn hàng chờ
    if (content?.toLowerCase().startsWith('vị trí của bạn')) color = livechat_color.queue;
    if (content?.toLowerCase().startsWith('vị trí hàng chờ')) return;

    // Tin nhắn whisper của bot gửi và player nhắn cho bot
    if (content?.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    // Ẩn spam message number
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

function sendCustomMessage(type, content) {
    let color = livechat_color.default;

    if (type == 'connect') color = Colors.Green;
    if (type == 'disconnect') color = Colors.Red;

    sendMessage(globalChannel.join, {
        embeds: [{
            description: content,
            color: color,
            timestamp: new Date().toISOString()
        }]
    });
}

function sendBotLog(type, content) {
    let chat = content;
    let color;

    if (type == 'join') color = botlog_color.join_log;
    if (type == 'queue') color = botlog_color.queue_log;
    if (type == 'disconnect') color = botlog_color.disconnect_log;

    sendMessage(globalChannel.log, {
        embeds: [{
            description: chat,
            color: color,
            timestamp: new Date().toISOString()
        }]
    });
}

function getUptime(bot) {
    if (!bot.data.uptime) return '';
    return getDorHMS((Date.now() - bot.data.uptime) / 1000);
}

module.exports = {
    sendCustomMessage,
    sendGlobalChat,
    sendBotLog,
    getUptime
}
