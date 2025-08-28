// routes/auth.js
const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP } = require('../controllers/auth');

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
