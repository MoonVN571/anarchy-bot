const { Bot } = require('mineflayer');
const globalChnanel = require('../bot').channel;
const stats = require('./minecraft/stats');
const index = require('../index');
const { getDorHMS, log } = require('./utils');
const { createWebhook, getWebhook } = require('./botFunc');

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

const data = {
    guildId: index.config.devGuild,
    webhookLivechat: globalChnanel.webhookLivechat,
    webhookJoin: globalChnanel.webhookJoin,
    webhookJoinMessage: globalChnanel.webhookJoinMessage,
    webhookServer: globalChnanel.webhookServer
}

/**
 * 
 * @param {Bot} bot 
 * @param {String} content 
 * @param {String} username 
 * @param {String} message 
 */
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

    let embedObject = {
        description: userChat,
        color: color,
        timestamp: new Date()
    };

    if ((!content.includes("has made the advancement") && !content.includes("has complete")
    && !content.includes("has reached") && color == livechat_color.system)
    ) sendMessage(data.guildId, data.webhookServer, { embeds: [embedObject] })

    if(color == livechat_color.whisper) log(content);

    sendMessage(data.guildId, data.webhookLivechat, { embeds: [embedObject] });
}

async function sendMessage(guildId, webhookId, msg) {
    let webhook = await getWebhook(guildId, webhookId);

    if(webhook?.error) return;
    createWebhook({ url: webhook.url }, msg);
}


/**
 * 
 * @param {String} type Loại log khác
 * @param {String} content 
 */
function sendCustomMessage(type, content) {
    let color = livechat_color.default;

    if (type == 'connect') color = "GREEN";
    if (type == 'disconnect') color = "RED";

    sendMessage(data.guildId, data.webhookLivechat, {
        embeds: [{
            description: content,
            color: color,
            timestamp: new Date()
        }]
    });
}

/**
 * 
 * @param {String} type Loại
 * @param {String} content Nội dung
 */
function sendBotLog(type, content) {
    let chat = content;
    let color;

    if (type == 'join') color = botlog_color.join_log;
    if (type == 'queue') color = botlog_color.queue_log;
    if (type == 'disconnect') color = botlog_color.disconnect_log;

    sendMessage(data.guildId, data.webhookJoin, {
        embeds: [{
            description: chat,
            color: color,
            timestamp: Date.now()
        }]
    });
}

/**
 * 
 * @param {Bot} bot Mineflayer API
 * @param {boolean} vi Thời gian trả về tiếng việt
 * @returns String
 */
function getUptime(bot, vi) {
    if (!bot.uptime) return '';

    if (vi) return getDorHMS((Date.now() - bot.uptime) / 1000, true);

    return getDorHMS((Date.now() - bot.uptime) / 1000);
}

module.exports = {
    sendCustomMessage,
    sendGlobalChat,
    sendBotLog,
    getUptime
}
