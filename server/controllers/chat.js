// controllers/chat.js
const Chat = require('../models/Chat');

exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({});
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { chatId, text } = req.body;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    chat.messages.push({ text, sender: 'me', time });
    chat.lastMessage = text;
    chat.time = 'Now';
    await chat.save();

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
