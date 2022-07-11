const { WebhookClient } = require('discord.js');
const client = require('../discord').client;
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
    log(bot.arrayMessages);
    if(bot.arrayMessages.length <= 0) return;
    log('Thực thi lệnh: ' + bot.arrayMessages[0]);
    bot.chat(bot.arrayMessages[0]);
    bot.arrayMessages.shift();
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}

function createWebhook(option, message) {
    const webhook = new WebhookClient(option);
    webhook.send(message).catch(console.error);
}

async function getWebhook(guildId, webhookId) {
    let webhook = (await client.guilds.cache.get(guildId)?.fetchWebhooks())
        ?.map(d => d).find(webhook => webhook.id == webhookId);

    if (!webhook?.id) return { error: 'Unknown webhooks.' };

    if (webhook.name !== 'moonbot' || webhook.avatar !== client.user.avatarURL()) webhook.edit({
        name: 'moonbot',
        avatar: client.user.avatarURL()
    });

    return webhook;
}

module.exports = {
    createWebhook,
    getWebhook,
    setStatus,
    solveAlotMessage
}
