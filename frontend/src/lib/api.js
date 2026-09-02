const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function sendChatMessage({ message, mode, sessionId, userId, profile }) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      mode,
      session_id: sessionId,
      user_id: userId,
      profile,
    }),
  })

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`)
  }

  return res.json()
}

export async function getChatHistory(sessionId) {
  const res = await fetch(`${API_BASE}/api/chat/history/${encodeURIComponent(sessionId)}`)
  if (!res.ok) throw new Error(`Failed to load history: ${res.status}`)
  return res.json()
}

export async function getUserSessions(userId) {
  const res = await fetch(`${API_BASE}/api/chat/sessions?user_id=${encodeURIComponent(userId)}`)
  if (!res.ok) throw new Error(`Failed to load sessions: ${res.status}`)
  return res.json()
}

// for create payemtn 

export async function createPayment({ amount, purpose, session_id, user_id }) {
  const res = await fetch(`${API_BASE}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, purpose, session_id, user_id }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return body;
}

export async function getPaymentStatus(transactionId) {
  const res = await fetch(`${API_BASE}/api/payments/${transactionId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function addSandboxCredit({ transaction_id, amount, upi_id, payer_vpa }) {
  const res = await fetch(`${API_BASE}/api/payments/sandbox/credit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id, amount, upi_id, payer_vpa }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
  return body;
}

// ----- Razorpay Standard Checkout -----

export async function createRazorpayOrder({ amount, purpose, session_id, user_id }) {
  const res = await fetch(`${API_BASE}/api/razorpay/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, purpose, session_id, user_id }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return body;
}

export async function verifyRazorpayPayment({ razorpay_payment_id, razorpay_order_id, razorpay_signature, session_id, user_id }) {
  const res = await fetch(`${API_BASE}/api/razorpay/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_payment_id, razorpay_order_id, razorpay_signature, session_id, user_id }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.detail || `HTTP ${res.status}`);
  return body;
}

// ----- Profile (Phase 3) -----

export async function getProfile(userId) {
  const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function saveProfile(body) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data;
}
