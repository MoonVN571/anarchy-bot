const client = require('../discord').client;
const { readdirSync } = require('fs');

readdirSync('./events/').forEach(eventName =>
    require('../events/'+eventName)
);