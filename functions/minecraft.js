const client = require('../index').client;
const { Bot } = require('mineflayer');
const { getDorHMS, log } = require('./utils');
const kd = require('../db/stats');
const setup = require('../db/setup');
const { config } = require('../bot');
const globalChnanel = require('../bot').channel;

let livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    dead: 0xDB2D2D,
    system: 0xb60000,
    whisper: 0xFD00FF,
    chatbot: 0x4983e7,
    queue: 0xFFC214
}

let botlog_color = {
    join_log: 0x15ff00,
    queue_log: 0xeeee00,
    disconnect_log: 0xF71319
}

let messageList = [];
let joinList = [];

async function sendGlobalChat(bot, content, username, message) {
    let userChat = `**<${username}>** ${message}`;
    let color = livechat_color.default;

    // Nếu message player = ">" color là xanh
    if(message?.startsWith(">")) color = livechat_color.highlight;

    if(!username) {
        color = livechat_color.system;
        userChat = content;
    }

    // Check nếu tin nhắn là death message
    if(isDeathMessage(content)) color = livechat_color.dead;

    // Lưu lại KD của player nếu không phài dev mode
    if(color == livechat_color.dead) saveStats(bot, content);

    // Tin nhắn được gửi bởi bot
    if(username == bot.config.botName) color = livechat_color.chatbot;

    // Tin nhắn hàng chờ
    if(content?.toLowerCase().startsWith('vị trí của bạn')) color = livechat_color.queue;
    if(content?.toLowerCase().startsWith('vị trí hàng chờ')) return;

    // Tin nhắn whisper của bot gửi và player nhắn cho bot
    if(content?.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;

    // Ẩn spam message number
    if(!isNaN(userChat)) return;

    let embedObject = {
        description: userChat,
        color: color,
        timestamp: new Date()
    };

    if((!content.includes("has made the advancement")
    && !content.includes("has complete")
    && !content.includes("has reached")
    && color == livechat_color.system) || color == livechat_color.whisper) client.channels.cache.get(globalChnanel.server).send({
        embeds: [embedObject]
    });

    if(color == livechat_color.queue) return sendMessage(bot, [embedObject]);
    
    messageList.push(embedObject);
    // log('Đã nhận ' + messageList.length + ' tin nhắn để gửi hàng loạt.');

    if(messageList.length >= 5) sendMessage(bot, messageList);
}

async function sendMessage(bot, msg) {
    // Gửi message vào server dev của bot
    client.channels.cache.get(globalChnanel.chat).send({
        embeds: msg
    });

    if(bot.config.dev) {
        if(msg.length >= 5) messageList = [];
        return;
    }

    // Lấy tất cả channel đã setup và cho thành array
    let channel = (await setup.find()).map(d=>d).filter(d=>d.livechat);
    if(!channel || channel.length == 0) return messageList = [];;

    channel.forEach(ch=> {
        let channelable = client.channels.cache.get(ch.livechat);

        if(channelable) channelable.send({
            embeds: msg
        }).catch(()=>{});
    });

    if(msg.length >= 5) messageList = [];
}

/**
 * 
 * @param {Bot} bot 
 * @param {String} content 
 */
function saveStats(bot, content) {
    let deathsRegex = require('../set').stats.deaths;
    let killBeforeRegex = require('../set').stats.killBef;
    let killAfterRegex = require('../set').stats.killAft;

    if(content.match(deathsRegex)) {
        let username = content.match(deathsRegex);
        log(username[1] + ' + death');
        saveDeaths(username[1]);
    }

    if(content.match(killBeforeRegex)) {
        let usernameList = content.match(killBeforeRegex);

        log('Death: ' + usernameList[3] + ' - Kills: ' + usernameList[2]);

        saveKills(usernameList[2]);
        saveDeaths(usernameList[3]);
    }

    if(content.match(killAfterRegex)) {
        let usernameList = content.match(killAfterRegex);
        let uname = usernameList[2];

        if(uname.includes('\'')) uname = uname.split('\'')[0];
        if(uname?.split(" ").length > 1) uname = uname.split(' ')[0];

        log('Death: ' + usernameList[1] + ' - Kills: ' + uname);

        saveDeaths(usernameList[1]);
        saveKills(uname);
    }

    async function saveDeaths(username) {
        let playerList = Object.values(bot.players).map(d => d.username);

        if(playerList.indexOf(username) < 0) return;

        let kdData = await kd.findOne({username:username});
        if(!kdData) return kd.create({username:username,deaths:1,kills:0});

        if(playerList.indexOf(username) > -1) {
            log(username + ' + 1 death');
            if(config.dev) return;
            kdData.deaths += 1; 
            kdData.save();
        }
    }

    async function saveKills(username) {
        let playerList = Object.values(bot.players).map(d => d.username);

        if(playerList.indexOf(username) < 0) return;

        let kdData = await kd.findOne({username:username});
        if(!kdData) return kd.create({username:username,deaths:0,kills:1});

        log(username + ' + 1 kill');
        if(config.dev) return;
        kdData.kills += 1; 
        kdData.save();
    }
}

/**
 * 
 * @param {String} type Loại log khác
 * @param {String} content 
 */
function sendCustomMessage(type, content) {
    let color = livechat_color.default;
    let channel;
    
    if(type == 'connect') { channel = globalChnanel.join; color = "GREEN"; }
    if(type == 'disconnect') { channel = globalChnanel.join; color = "RED"; }

    joinList.push({
        description: content,
        color: color,
        timestamp: new Date()
    });

    if(joinList.length == 5) {
        client.channels.cache.get(channel).send({
            embeds:joinList
        }).catch(()=>{});
        joinList = [];
    }
}

/**
 * 
 * @param {String} type Loại
 * @param {String} content Nội dung
 */
function sendBotLog(type, content) {
    let chat = content;
    let color;

    if(type=='join') color = botlog_color.join_log;
    if(type=='queue') color = botlog_color.queue_log;
    if(type=='disconnect') color = botlog_color.disconnect_log;


    client.channels.cache.get(globalChnanel.log).send({
        embeds:[{
            description: chat,
            color: color
        }]
    });
}

/**
 * 
 * @param {String} message 
 * @returns 
 */
function isDeathMessage(message) {
    if(!message) return;
    if(message.match(require('../set').stats.deaths)
    || message.match(require('../set').stats.killBef)
    || message.match(require('../set').stats.killAft)
    || message.match(require('../set').stats.noStats)) return true;
}

/**
 * 
 * @param {Bot} bot Mineflayer API
 * @param {boolean} vi Thời gian trả về tiếng việt
 * @returns String
 */
function getUptime(bot, vi) {
    if(!bot.uptime) return '';

    if(vi) return getDorHMS((Date.now()-bot.uptime)/1000, true);

    return getDorHMS((Date.now()-bot.uptime)/1000);
}

module.exports = {
    sendGlobalChat,
    sendBotLog,
    getUptime,
    sendCustomMessage,
}
