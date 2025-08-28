// models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: String,
  sender: { type: String, enum: ['me', 'other'], required: true },
  time: { 
    type: String, 
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
});

const chatSchema = new mongoose.Schema({
  name: String,
  avatar: String,
  messages: [messageSchema],
  lastMessage: String,
  time: String,
  unread: { type: Number, default: 0 }
});

module.exports = mongoose.model('Chat', chatSchema);
