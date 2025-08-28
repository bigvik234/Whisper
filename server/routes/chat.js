// routes/chat.js
const express = require('express');
const router = express.Router();
const { getChats, sendMessage } = require('../controllers/chat');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, getChats);
router.post('/send', authMiddleware, sendMessage);

module.exports = router;
