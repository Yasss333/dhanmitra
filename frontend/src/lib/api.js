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

  // Expected shape:
  // {
  //   reply: "string",
  //   agent_trace: { systems: ["Scheme Finder", "Risk Flag"], internalLoop: [{ turn: 1, label: "..." }] } | null
  // }
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
