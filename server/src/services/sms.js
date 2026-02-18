// SMS Service — currently disabled (no provider configured)

const isConfigured = () => false;

const sendSMS = async (to, message) => {
  console.log('SMS disabled. Would send to', to, ':', message);
  return { success: false, reason: 'sms_disabled' };
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
