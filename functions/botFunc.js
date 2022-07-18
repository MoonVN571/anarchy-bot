const { ActivityType } = require('discord.js');
const { config } = require('../bot');
const client = require('../discord').client;

function setStatus(status, type, message) {
    let activity = "";
    if(type == "Playing") activity = ActivityType.Watching;
    if(type == "Watching") activity = ActivityType.Playing;
    
    if(config.dev) return;

    client.user.setPresence({
        status: status,
        activities: [
            {
                type: activity,
                name: message
            }
        ]
    });
}

module.exports = {
    setStatus
}
