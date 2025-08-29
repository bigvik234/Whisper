// utils/sms.js
const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to, body) => {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to, // e.g., +2348031234567
    });
    console.log('SMS sent:', message.sid);
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
    throw new Error('SMS failed');
  }
};

module.exports = { sendSMS };