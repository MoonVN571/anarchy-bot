const client = require('../discord').client;

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

module.exports = {
    setStatus
}
