import { sendNotificationToUser } from './kafka-connect.js';

const NOTIFICATION_TYPES = {
  OUTBID: 'outbid',
  DOMAIN_SOLD: 'domain_sold',
  AUCTION_ENDING: 'auction_ending',
  PAYMENT_DUE: 'payment_due',
  DOMAIN_WON: 'domain_won'
}

export const sendOutbidNotification = async (userId, domainName, currentBid, previousBid) => {
  const notification = {
    type: NOTIFICATION_TYPES.OUTBID,
    title: 'You have been outbid!',
    message: `Your bid of $${previousBid} for ${domainName} has been outbid. Current highest bid: $${currentBid}`,
    domainName,
    currentBid,
    previousBid,
    timestamp: new Date().toISOString()
  };

  return await sendNotificationToUser(userId, notification);
}

export const sendDomainSoldNotification = async (ownerId ,userName, domainName, price) => {
  const notification = {
    type: NOTIFICATION_TYPES.DOMAIN_SOLD,
    title: 'Domain sold!',
    message: `Your ${domainName} is sold for price: ${price} to ${userName}`,
    timestamp: new Date().toISOString()
  }
  
  return await sendNotificationToUser(ownerId, notification)
}

export const sendDomainWonNotification = async (userId, domainName, winningBid) => {
  const notification = {
    type: NOTIFICATION_TYPES.DOMAIN_WON,
    title: 'Congratulations! You won the auction!',
    message: `You won ${domainName} with a bid of $${winningBid}. Payment is now due.`,
    domainName,
    winningBid,
    timestamp: new Date().toISOString()
  };

  return await sendNotificationToUser(userId, notification);
}

export const sendPaymentDueNotification = async (userId, domainName, amount, dueDate) => {
  const notification = {
    type: NOTIFICATION_TYPES.PAYMENT_DUE,
    title: 'Payment Due',
    message: `Payment of $${amount} is due for ${domainName} by ${dueDate}`,
    domainName,
    amount,
    dueDate,
    timestamp: new Date().toISOString()
  };

  return await sendNotificationToUser(userId, notification);
}

export { NOTIFICATION_TYPES };
