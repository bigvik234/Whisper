// utils/sms.js
const axios = require('axios');

const sendSMS = async (to, message) => {
  const username = process.env.AFRIKASTALKING_USERNAME;
  const apiKey = process.env.AFRIKASTALKING_API_KEY;

  // ✅ Include username in form data
  const formData = new URLSearchParams();
  formData.append('username', username); // ← This is REQUIRED
  formData.append('to', to);
  formData.append('message', message);
  formData.append('from', 'Whisper'); // Optional: your sender ID

  try {
    const response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'apiKey': apiKey, // API key in header
        },
        // No auth here — username is in form data
      }
    );

    if (response.data && response.data.status === 'Success') {
      console.log('✅ SMS sent:', response.data);
    } else {
      throw new Error(response.data?.message || 'Unknown error');
    }
  } catch (err) {
    console.error('SMS Error:', err.response?.data || err.message);
    throw new Error('Failed to send SMS');
  }
};

module.exports = { sendSMS };