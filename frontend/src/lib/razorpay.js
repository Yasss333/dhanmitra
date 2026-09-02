import { verifyRazorpayPayment } from '@/lib/api';

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

/**
 * Open the Razorpay Standard Checkout popup for a pre-created order.
 * Resolves with the verified server response on success, or rejects on
 * failure. Resolves with null if the user dismisses the modal.
 */
export function openRazorpayCheckout({ order, user, sessionId, userId, onPayment }) {
  return new Promise((resolve, reject) => {
    if (!RAZORPAY_KEY) return reject(new Error('VITE_RAZORPAY_KEY_ID is missing in frontend/.env'));
    if (typeof window.Razorpay === 'undefined') {
      return reject(new Error('Razorpay checkout script failed to load. Check your internet connection.'));
    }

    const options = {
      key: RAZORPAY_KEY,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'DhanMitra',
      description: order.purpose || 'DhanMitra payment',
      order_id: order.order_id,
      theme: { color: '#13795b' },
      prefill: {
        name: user?.fullName || 'DhanMitra User',
        email: user?.primaryEmailAddress?.emailAddress || '',
        contact: user?.primaryPhoneNumber?.phoneNumber || '',
      },
      handler: async (response) => {
        try {
          const verified = await verifyRazorpayPayment({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            session_id: sessionId || 'default',
            user_id: userId || 'anonymous',
          });
          if (onPayment) onPayment(verified);
          resolve(verified);
        } catch (err) {
          reject(err);
        }
      },
      modal: { ondismiss: () => resolve(null) },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      reject(new Error(response.error?.description || 'Payment failed'));
    });
    rzp.open();
  });
}