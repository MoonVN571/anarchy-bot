const client = require('../index').client;
const { Bot } = require('mineflayer');
const { getDorHMS } = require('./utils');
const kd = require('../db/stats');
const setup = require('../db/setup');
const globalChnanel = require('../bot').channel;

let livechat_color = {
    default: 0x979797,
    highlight: 0x2EA711,
    dead: 0xDB2D2D,
    system: 0xb60000,
    whisper: 0xFD00FF,
    chatbot: 0x4983e7
}

let botlog_color = {
    join_log: 0x15ff00,
    queue_log: 0xeeee00,
    disconnect_log: 0xF71319
}

let messageList = [];
let joinList = [];

async function sendGlobalChat(bot, content, username, message) {
    /*console.log({
        content: content,
        username: username,
        message: message
    }) */
    let chat = `**<${username}>** ${message}`;

    let color = livechat_color.default;

    // Nếu message player = ">" color là xanh
    if(message?.startsWith(">")) color = livechat_color.highlight;

    if(!username) {
        color = livechat_color.system;
        chat = content;
    }

    // Lưu lại KD của player nếu không phài dev mode
    if(!bot.config.dev && color == livechat_color.dead) saveStats(bot, content);

    // Check nếu tin nhắn là death message
    if(isDeathMessage(content)) color = livechat_color.dead;

    // Tin nhắn được gửi bởi bot
    if(username == bot.config.botName) color = livechat_color.chatbot;

    // Tin nhắn whisper của bot gửi và player nhắn cho bot
    if(content.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;


    // Push vào array embed, nếu trên x lần sẽ gửi vào kênh tránh ratelimit
    messageList.push({
        description: chat,
        color: color,
        timestamp: new Date()
    });

    // Log message để thêm vào death message list
    if(color == livechat_color.system
        && !chat.includes("has made the advancement")
        ) {
        client.channels.cache.get(globalChnanel.server).send({
            embeds: [{
                description: chat,
                color: color,
                timestamp: new Date()
            }]
        })
    }
    
    if(messageList.length == 5) {
        // Gửi message vào server dev của bot
        client.channels.cache.get(globalChnanel.chat).send({
            embeds: messageList
        });

        if(bot.config.dev) {
            messageList = [];
            return;
        }

        // Lấy tất cả channel đã setup và cho thành array
        let channel = (await setup.find()).map(d=>d).filter(d=>d.livechat);
        if(!channel || channel.length == 0) return;

        channel.forEach(ch=> {
            let channelable = client.channels.cache.get(ch.livechat);

            if(channelable) channelable.send({
                embeds: messageList
            }).catch(()=>{});
        });

        messageList = [];
    }
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
        saveDeaths(username[2]);
    }

    if(content.match(killBeforeRegex)) {
        let usernameList = content.match(killBeforeRegex);
        let uname = usernameList;

        if(uname.includes('\'')) uname = uname.split('\'')[0];

        saveKills(usernameList[2]);
        saveDeaths(usernameList[3]);
    }

    if(content.match(killAfterRegex)) {
        let usernameList = content.match(killAfterRegex);
        let uname = usernameList[3];

        if(uname.includes('\'')) uname = uname.split('\'')[0];

        saveDeaths(usernameList[1]);
        saveKills(uname);
    }

    async function saveDeaths(username) {
        let playerList = Object.values(bot.players).map(d => d.username);

        if(playerList.indexOf(username) < 0) return;

        let kdData = await kd.findOne({username:username});
        if(!kdData) return kd.create({username:username,deaths:1,kills:0});

        if(playerList.indexOf(username) > -1) {
            kdData.deaths += 1; 
            kdData.save();
        }
    }

    async function saveKills(username) {
        let playerList = Object.values(bot.players).map(d => d.username);

        if(playerList.indexOf(username) < 0) return;

        let kdData = await kd.findOne({username:username});
        if(!kdData) return kd.create({username:username,deaths:0,kills:1});

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
