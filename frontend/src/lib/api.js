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