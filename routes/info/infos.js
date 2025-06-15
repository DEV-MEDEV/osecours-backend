// routes/info/infos.js
const express = require('express');
const router = express.Router();
const Consts = require('../../config/const');

router.get('/', (req, res) => {
    const date = Consts.getDateLib()().format('YYYY-MM-DD HH:mm:ss');

    return res.json({
        appName: Consts.APP_NAME,
        description: Consts.PROJECT_DESCRIPTION,
        author: Consts.APP_AUTHOR,
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        date
    });
});

module.exports = router;
