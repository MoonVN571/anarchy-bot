const express = require('express');
const app = express();
const { log } = require('../functions/utils');
const data_route = require('./routes/data.route');
const supportData = ['joindate', 'playtime', 'stats', 'seen'];
const port = process.env.PORT || 80;
app.get('/', (req, res) => {
    if (!req.hostname.startsWith('api.')) return;
    const arr = supportData.map(data => `GET /data/anarchyvn/${data}/mo0nbot3/api-key`);
    res.send(
        `<title>Anarchy Bot - API</title>
        Endpoint:<br>
        ${arr.join('<br>')}
        <br><br>`);
});
app.use(data_route);
app.all('*', (req, res) => {
    res.send({
        statusCode: 404,
        msg: 'Invalid data!'
    })
});
app.listen(port, () => log(`Listening on port ${port}!`));