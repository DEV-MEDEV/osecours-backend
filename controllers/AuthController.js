// controllers/AuthController.js
const express = require('express');
const router = express.Router();

const service = 'auth';

// Import des routes modulaires
const loginRoute = require('../routes/' + service + '/login');
const logoutRoute = require('../routes/' + service + '/logout');
const otpRoute = require('../routes/' + service + '/otp');
const refreshRoute = require('../routes/' + service + '/refresh');
const sessionsRoute = require('../routes/' + service + '/sessions');

router.use('/login', loginRoute);           // POST /auth/login
router.use('/logout', logoutRoute);         // POST /auth/logout
router.use('/otp', otpRoute);              // POST /auth/otp-request, /auth/verify-otp
router.use('/refresh', refreshRoute);       // POST /auth/refresh
router.use('/sessions', sessionsRoute);     // GET /auth/sessions, DELETE /auth/sessions/:id

module.exports = router;