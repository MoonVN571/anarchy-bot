const express = require('express');
const app = express();
const { log } = require('./functions/utils');
const supportData = ['joindate', 'playtime', 'stats', 'seen'];
const port = process.env.PORT || 80;
const joindate = require('./db/joindate');
const seen = require('./db/seen');
const playtime = require('./db/playtime');
const stats = require('./db/stats');
const apiKey = require('./db/apiKey');
app.get('/', (req, res) => {
    if (!req.hostname.startsWith('api.')) return;
    const arr = supportData.map(data => `GET /data/anarchyvn/${data}/mo0nbot3/<api-key>`);
    res.send(
        `<title>Anarchy Bot - API</title>
        \u300b Endpoint:<br>
        ${arr.join('<br>')}
        <br><br>`);
});
app.get('/data/anarchyvn/:data/:username/apikey', async (req, res) => {
    if (!req.hostname.startsWith('api.')) return;
    const username = req.params?.username;
    const data = req.params?.data;
    const key = req.params?.apikey;
    const api = await apiKey.findOne({ key: key });
    if (!api) return res.send({
        statusCode: 404, msg: 'Invalid api key!'
    });
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
app.listen(port, () => console.log('Listening on port ' + port + '!'));