// controllers/auth.js
const User = require('../models/User');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Send OTP (Login or Register)
exports.sendOTP = async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone is required' });
  }

  let user = await User.findOne({ $or: [{ email }, { phone }] });

  const userId = user ? user._id : new mongoose.Types.ObjectId();
  if (!user) {
    // Temp user if new
    user = new User({ _id: userId });
    await user.save();
  }

  // Generate 6-digit OTP
  const code = crypto.randomInt(100000, 999999).toString();

  // Save OTP
  const otp = new OTP({
    userId,
    code,
    expiresAt: new Date(Date.now() + 300000), // 5 min
  });
  await otp.save();

  console.log(`🔐 OTP for ${email || phone}: ${code}`); // Simulate SMS/email

  res.json({ message: 'OTP sent', userId: userId.toString() });
};

// Verify OTP and Complete Login/Register
exports.verifyOTP = async (req, res) => {
  const { userId, code, name, email, phone, password } = req.body;

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
      email,
      phone,
      password: hashed,
      verified: true,
    });
  } else {
    user.verified = true;
    await user.save();
  }

  // Delete OTPs
  await OTP.deleteMany({ userId });

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    message: isExisting ? 'Logged in' : 'Registered',
    token,
    user: { name: user.name, email: user.email, phone: user.phone }
  });
};
