const express = require('express');
const app = express();
const data_route = require('./routes/data.route');
const port = process.env.PORT || 80;
app.all('*', (req, res, next) => {
    if (req.hostname.startsWith('api.')) next();
});
app.get('/', (req, res) => {
    res.send(require('./api.json'));
});
app.use(data_route);
app.all('*', (req, res) => {
    res.send({
        statusCode: 404,
        msg: 'Invalid arguments!'
    });
});
app.listen(port, () => console.log(`Listening on port ${port}!`));