const express = require('express');
const router = express.Router();
router.get('/data/:server/:stats/:username', require('../controllers/stats'));
router.get('/data/:server', require('../controllers/server'));
// router.get('/test', require('../controllers/test'));
module.exports = router;