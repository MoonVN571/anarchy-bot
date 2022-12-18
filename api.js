const express = require('express');
const app = express();
const { config } = require('.');
const joindate = require('./db/joindate');
const seen = require('./db/seen');
const playtime = require('./db/playtime');
const stats = require('./db/stats');
const { log } = require('./functions/utils');
const supportData = ['joindate', 'playtime', 'stats', 'seen'];
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
    if (!config.dev) log(`${req.ip} requested ${req.hostname}`);
    if (!req.hostname.startsWith('api.')) return;
    //GET /data/anarchyvn/joindate/mo0nbot
    const arr = supportData.map(data => `GET /data/anarchyvn/${data}/mo0nbot3`);
    res.send(
        `<title>Anarchy Bot - API</title>
        \u300b Endpoint:<br>
        ${arr.join('<br>')}
        <br><br>`);
});
app.get('/data/anarchyvn/:data/:username', async (req, res) => {
    if (!config.dev) log(`${req.ip} requested ${req.host}`);
    if (!req.hostname.startsWith('api.')) return;
    const username = req.params?.username;
    const data = req.params?.data;
    if (supportData.indexOf(data) == -1)
        return res.send({ statusCode: 404, msg: `Data '${data}' not found on server!` });
    const db = await eval(`${data}`).find({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (!username || !db || !db[0])
        return res.send({ statusCode: 404, msg: `Username '${username}' not found on server!` });
    res.send(db[0]);
});
app.listen(process.env.PORT || 80, () => console.log('Listening on port', port));