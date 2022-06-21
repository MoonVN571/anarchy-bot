const client = require('../index').discord;
const { readdirSync } = require('fs');

readdirSync('./events/').forEach(eventName =>
    require('../events/'+eventName)
);

readdirSync('./commands').forEach(dir => {
    const cmd = readdirSync('./commands/'+dir);

    cmd.forEach(cmdName => {
        const promo = require('../commands/'+dir+'/'+cmdName);

        client.commands.set(cmdName.split(".")[0], promo);
    });
});