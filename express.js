const express = require('express');
const app = express();
const data_route = require('./routes/data.route');
const { rateLimit } = require('express-rate-limit');
const port = process.env.PORT || 80;
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: (req, res) => {
        res.send({ status: false, msg: 'Too many requests try again later!' });
    },
})
app.use(limiter);
app.all('*', (req, res, next) => {
    if (req.hostname.startsWith('api.')) next();
});
app.get('/', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Request success`);
    res.send(require('./api.json'));
});
app.use(data_route);
app.all('*', (req, res) => {
    console.log(`[${new Date().toLocaleString()}] Invalid request`);
    res.send({
        statusCode: 404,
        msg: 'Invalid arguments!'
    });
});
app.listen(port, () => console.log(`Listening on port ${port}!`));