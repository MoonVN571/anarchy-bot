const express = require('express');
const router = express.Router();
router.get('/data/anarchyvn/:data/:username/:apikey', require('../controllers/data'));
module.exports = router;