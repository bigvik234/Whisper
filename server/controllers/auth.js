// controllers/auth.js
const mongoose = require('mongoose');
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendSMS } = require('../utils/sms'); // Africas Talking SMS utility

/**
 * Send OTP to user's phone number
 */
exports.sendOTP = async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Normalize phone number (remove spaces, ensure +234 or 0 format)
  const normalizedPhone = phone.replace(/\s+/g, '');
  // Africas Talking works with +234 or 0 prefixes

  let user = await User.findOne({ phone: normalizedPhone });
  const userId = user ? user._id : new mongoose.Types.ObjectId();

  if (!user) {
    user = new User({
      _id: userId,
      phone: normalizedPhone,
      verified: false,
    });
    await user.save({ validateBeforeSave: false });
  }

  // Generate 6-digit OTP
  const code = crypto.randomInt(100000, 999999).toString();

  // Save OTP to database
  const otp = new OTP({
    userId,
    code,
    expiresAt: new Date(Date.now() + 300000), // 5 minutes
  });
  await otp.save();

  // ✅ Log OTP to console (for debugging)
  console.log(`🔐 OTP for ${normalizedPhone}: ${code}`);

  // ✅ Send SMS via Africas Talking
  try {
    await sendSMS(normalizedPhone, `Your Whisper verification code is ${code}. Valid for 5 minutes.`);
    console.log(`✅ SMS sent successfully to ${normalizedPhone}`);
    res.json({ message: 'OTP sent', userId: userId.toString() });
  } catch (err) {
    console.error('❌ SMS failed:', err.message);
    // Still return success in dev mode so you can test with console OTP
    res.status(200).json({
      message: 'OTP sent (SMS failed - check console)',
      userId: userId.toString()
    });
  }
};

/**
 * Verify OTP and complete login/register
 */
exports.verifyOTP = async (req, res) => {
  const { userId, code, name, password } = req.body;

  // Find valid OTP
  const otp = await OTP.findOne({ userId, code });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  let user = await User.findById(userId);
  const isExisting = !!user;

  if (!user) {
    // New user: register
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({
      name,
      phone: otp.userId, // Will be linked from OTP
      password: hashedPassword,
      verified: true,
    });
  } else {
    // Existing user: mark as verified
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

  // ✅ Confirm in console
  console.log(`✅ User ${user.name} (${user.phone}) ${isExisting ? 'logged in' : 'registered'} successfully`);

  res.json({
    message: isExisting ? 'Logged in' : 'Registered',
    token,
    user: { name: user.name, phone: user.phone },
    isExisting
  });
};