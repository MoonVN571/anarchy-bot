const { Colors } = require('discord.js');
const client = require('../../index').discord;
const globalChannel = require('../../games/index').channel;
const stats = require('./stats');
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
let messages = [];
let countMsgs = 0;
let flagged = false;
module.exports.sendGlobalChat = async (bot, content, username, message) => {
    let userChat = `**<${escapeFormat(username)}>** ${escapeFormat(message)}`;
    let color = getColor(bot, content, username, message);
    if (!username) userChat = escapeFormat(content);
    if (color == livechat_color.dead) stats.save(bot, content);
    if (!isNaN(userChat)) return;
    const embed = {
        description: userChat,
        color: color,
        timestamp: new Date().toISOString()
    };
    if (color == livechat_color.system &&
        !(content == 'Hãy donate để giúp server duy trì bạn nhé!'
            || content == 'Click vào đây để donate'
            || content == 'Click vào đây để tham gia server discord AnarchyVN'
            || content == 'Click vào đây để vote cho server AnarchyVN'
            || content == 'Donate bằng thẻ cào để duy trì server, dùng lệnh /napthe và lệnh /muarank'
            || content == 'The main server is down. We will be back soon!'
            || content == 'Already connecting to this server!'
            || content == 'CS: You are using too many caps!'
            || content.endsWith("left the game")
            || content.endsWith("joined the game")
        )) sendMessage(globalChannel.server, { embeds: [embed] });
    countMsgs++;
    setTimeout(() => countMsgs--, 1000);
    messages.push(embed);
    if (countMsgs > 3) {
        if (!flagged) setTimeout(() => flagged = false, 1 * 60 * 1000);
        flagged = true;
    }
    if (flagged && messages.length < 10) return;
    sendMessage(globalChannel.livechat, { embeds: messages });
    messages = [];
}
function escapeFormat(content) {
    content = content?.replace(/\*/g, '\\*').replace(/\_/g, '\\_').replace(/\|/g, '\\|');
    return content;
}
function getColor(bot, content, username, message) {
    let color = livechat_color.default;
    if (!username) color = livechat_color.system;
    if (stats.isDeathMsgs(bot, content)) color = livechat_color.dead;
    if (bot.username && username == bot.username) color = livechat_color.chatbot;
    if (message?.startsWith(">")) color = livechat_color.highlight;
    if (content.toLowerCase().startsWith('vị trí hàng chờ')) color = livechat_color.queue;
    if (content.startsWith('nhắn cho') || content.includes('nhắn:')) color = livechat_color.whisper;
    if (color == livechat_color.system && content.endsWith("đã tham gia vào server."))
        color = livechat_color.join;
    if (color == livechat_color.system && content.endsWith("đã thoát khỏi server."))
        color = livechat_color.quit;
    if (color == livechat_color.system &&
        (content.includes("has made the advancement")
            || content.includes("has complete")
            || content.includes("has reached"))
    ) color = livechat_color.achievement;
    return color;
}
function sendMessage(channelId, msg) {
    const channel = client.channels.cache.get(channelId);
    channel.messages.fetch().then(msgs => {
        const message = msgs.first();
        const thisMsg = msg.embeds[0]?.description?.split('\n')[0];
        const checkMsg = message.embeds[0]?.description?.split('\n')[0];
        if (thisMsg && checkMsg && thisMsg == checkMsg) return;
        channel.send(msg).then(msg => {
            // console.log(Date.now() - msg.createdAt, 'ms');
        }).catch(err => console.log(err));
    });
}
