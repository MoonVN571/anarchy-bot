const { WebhookClient } = require('discord.js');

const client = require('../index').client;
const { log } = require("./utils");
function setStatus(status, type, message) {
    client.user.setPresence({
        status: status,
        activities: [
            {
                type: type,
                name: message
            }
        ]
    });
}

function solveAlotMessage(bot) {
    bot.arrayMessages;
    console.log(bot.arrayMessages);
    if(bot.arrayMessages.length <= 0) return;
    log('Thực thi lệnh: ' + bot.arrayMessages[0]);
    bot.chat(bot.arrayMessages[0]);
    bot.arrayMessages.shift();
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}

function createWebhook(url, message) {
    const webhook = new WebhookClient({ url: url });
    webhook.send(message).catch(() => {});
}

module.exports = {
    createWebhook,
    setStatus,
    solveAlotMessage
}
