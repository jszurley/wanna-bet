// SMS Service using Twilio
// Requires environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

let twilioClient = null;

// Lazy initialization to avoid errors when Twilio is not configured
const getClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const isConfigured = () => {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
};

const sendSMS = async (to, message) => {
  if (!isConfigured()) {
    console.log('SMS not configured. Would send to', to, ':', message);
    return { success: false, reason: 'not_configured' };
  }

  const client = getClient();
  if (!client) {
    return { success: false, reason: 'client_init_failed' };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    console.log('SMS sent:', result.sid);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error.message);
    return { success: false, reason: error.message };
  }
};

// Notification templates
const notifications = {
  newBetInvite: (creatorName, betTitle) =>
    `WannaBet: ${creatorName} challenged you to a bet: "${betTitle}". Open the app to respond!`,

  groupBetInvite: (creatorName, betTitle) =>
    `WannaBet: ${creatorName} invited you to a group bet: "${betTitle}". Pick your prediction!`,

  participantJoined: (participantName, betTitle) =>
    `WannaBet: ${participantName} joined "${betTitle}". The competition is heating up!`,

  betLocked: (betTitle) =>
    `WannaBet: "${betTitle}" is now locked with 2+ participants. Game on!`,

  betCompleted: (betTitle, isWinner) =>
    isWinner
      ? `WannaBet: You won "${betTitle}"! Collect your prize!`
      : `WannaBet: "${betTitle}" is complete. Better luck next time!`,

  betNeedsAction: (betTitle) =>
    `WannaBet: "${betTitle}" has ended. Mark it complete and select the winner!`
};

// Send notification to a user if they have SMS enabled
const notifyUser = async (user, messageType, ...args) => {
  if (!user.phone || !user.sms_notifications) {
    return { success: false, reason: 'user_not_subscribed' };
  }

  const messageGenerator = notifications[messageType];
  if (!messageGenerator) {
    return { success: false, reason: 'unknown_message_type' };
  }

  const message = messageGenerator(...args);
  return sendSMS(user.phone, message);
};

module.exports = {
  sendSMS,
  notifyUser,
  notifications,
  isConfigured
};
