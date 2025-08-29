// controllers/auth.js
const mongoose = require('mongoose');
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Import Twilio
const { sendSMS } = require('../utils/sms'); // We'll create this file

// Send OTP (Phone Only)
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  let user = await User.findOne({ phone });
  const userId = user ? user._id : new mongoose.Types.ObjectId();

  if (!user) {
    // Create temp user
    user = new User({
      _id: userId,
      phone,
      verified: false,
    });
    await user.save({ validateBeforeSave: false });
  }

  // Generate 6-digit OTP
  const code = crypto.randomInt(100000, 999999).toString();

  // Save OTP to DB
  const otp = new OTP({
    userId,
    code,
    expiresAt: new Date(Date.now() + 300000), // 5 minutes
  });
  await otp.save();

  // ✅ Log OTP to console (for debugging)
  console.log(`🔐 OTP for ${phone}: ${code}`);

  // ✅ Send real SMS
  try {
    await sendSMS(phone, `Your Whisper verification code: ${code}`);
    res.json({ message: 'OTP sent', userId: userId.toString() });
  } catch (err) {
    console.error('SMS failed:', err.message);
    // Still allow OTP in dev (fallback)
    return res.json({ message: 'OTP sent (SMS failed)', userId: userId.toString() });
  }
};

// Verify OTP and Complete Login/Register
exports.verifyOTP = async (req, res) => {
  const { userId, code, name, password } = req.body;

  const otp = await OTP.findOne({ userId, code });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  let user = await User.findById(userId);
  const isExisting = !!user;

  if (!user) {
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      phone: otp.userId, // Will be linked from OTP
      password: hashed,
      verified: true,
    });
  } else {
    user.verified = true;
    await user.save();
  }

  // Delete used OTPs
  await OTP.deleteMany({ userId });

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: isExisting ? 'Logged in' : 'Registered',
    token,
    user: { name: user.name, phone: user.phone },
    isExisting
  });
};