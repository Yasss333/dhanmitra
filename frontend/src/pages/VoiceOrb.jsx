import { useState, useEffect, useRef, useCallback } from 'react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, PhoneOff, AudioLines } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function VolumeListening() {
  return <AudioLines className="h-4 w-4 text-orange-400" />;
}
// ─────────────────────────────────────────────────────────────
// Vapi integration — replaces Web Speech API for voice
// ─────────────────────────────────────────────────────────────
import VapiModule from '@vapi-ai/web';
const Vapi = VapiModule.default || VapiModule;

const PROMPTS = {
  hindi:   { tap: 'बोलने के लिए गोले को दबाएँ', listening: 'सुन रहा हूँ... छोड़ें', thinking: 'सोच रहा हूँ...', speaking: 'बोल रहा हूँ...' },
  marathi: { tap: 'बोलण्यासाठी दाबा', listening: 'ऐकतोय... सोडा', thinking: 'विचार करतोय...', speaking: 'बोलतोय...' },
  kannada: { tap: 'ಒತ್ತಿ ಮಾತನಾಡಿ', listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ... ಬಿಡಿ', thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...', speaking: 'ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ...' },
  english: { tap: 'Tap to speak', listening: 'Listening... release', thinking: 'Thinking...', speaking: 'Speaking...' },
};

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const VAPI_ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;

export default function VoiceOrb() {
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const lang = profile?.language || 'hindi';
  const p = PROMPTS[lang] || PROMPTS.hindi;

  const [status, setStatus] = useState('idle'); // idle | listening | thinking | speaking
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState([]); // [{ id, role, text }]
  const vapiRef = useRef(null);
  const connectedRef = useRef(false);
  const idRef = useRef(0);
  const lastActivityRef = useRef(0);
  const AUTO_END_MS = 10000; // auto-end call after 10s of silence while connected

  const pushTranscript = useCallback((role, text) => {
    if (!text || !text.trim()) return;
    idRef.current += 1;
    setTranscript((prev) => [...prev.slice(-19), { id: idRef.current, role, text }]);
  }, []);

  // ── Vapi lifecycle ──────────────────────────────────────────
  const connect = useCallback(async () => {
    if (connectedRef.current) return;
    if (!VAPI_PUBLIC_KEY) {
      setError('VITE_VAPI_PUBLIC_KEY is missing in frontend/.env');
      return;
    }
    if (!VAPI_ASSISTANT_ID) {
      setError('VITE_VAPI_ASSISTANT_ID is missing in frontend/.env');
      return;
    }

    try {
      const vapi = new Vapi(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        connectedRef.current = true;
        lastActivityRef.current = Date.now();
        setStatus('listening');
        setError('');
      });

      vapi.on('call-end', () => {
        connectedRef.current = false;
        setStatus('idle');
        vapiRef.current = null;
      });

      vapi.on('speech-start', () => {
        setStatus('speaking');
      });

      vapi.on('speech-end', () => {
        lastActivityRef.current = Date.now();
        setStatus('listening');
      });

      vapi.on('message', (msg) => {
        // msg has { type: 'assistant' | 'user', content, transcript }
        const text = msg?.content || msg?.transcript;
        if (!text) return;
        lastActivityRef.current = Date.now();
        if (msg?.type === 'assistant') {
          pushTranscript('assistant', text);
        } else if (msg?.type === 'user') {
          pushTranscript('user', text);
        }
      });

      vapi.on('error', (err) => {
        console.error('Vapi error:', err);
        setError('Voice connection failed. Please try again.');
        connectedRef.current = false;
        setStatus('idle');
        vapiRef.current = null;
      });

      await vapi.start(VAPI_ASSISTANT_ID);
    } catch (err) {
      console.error('Vapi connect error:', err);
      setError(err.message || 'Failed to start voice call');
      connectedRef.current = false;
      vapiRef.current = null;
    }
  }, [pushTranscript]);

  const disconnect = useCallback(() => {
    const vapi = vapiRef.current;
    if (vapi) {
      try {
        vapi.stop();
      } catch {
        /* noop */
      }
    }
    vapiRef.current = null;
    connectedRef.current = false;
    setStatus('idle');
  }, []);

  // Auto-end the call after a period of silence while connected
  const disconnectRef = useRef(disconnect);

  useEffect(() => {
    disconnectRef.current = disconnect;
    const interval = setInterval(() => {
      if (connectedRef.current && Date.now() - lastActivityRef.current > AUTO_END_MS) {
        disconnectRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
        connectedRef.current = false;
      }
    };
  }, []);

  const handleOrbClick = () => {
    if (status === 'thinking') return;
    if (connectedRef.current) {
      disconnect();
    } else {
      connect();
    }
  };

  const statusText = {
    idle: p.tap,
    listening: p.listening,
    thinking: p.thinking,
    speaking: p.speaking,
  }[status];

  const isConnected = status !== 'idle';

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-8 px-6 relative">
      {/* Back button */}
      <button
        onClick={() => { disconnect(); navigate('/home'); }}
        className="absolute top-6 left-6 p-2.5 rounded-full bg-stone-800/60 hover:bg-stone-700/80 text-stone-400 hover:text-white transition-all border border-stone-700/50 backdrop-blur-sm z-10 flex items-center gap-2 px-4"
        aria-label="Go back to Home"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Back</span>
      </button>

      <div className="text-center">
        <p className="text-orange-400 text-xl font-bold tracking-wide">DhanMitra</p>
        <p className="text-stone-500 text-xs mt-1">धन का साथी</p>
      </div>

      {/* Orb */}
      <button
        onClick={handleOrbClick}
        disabled={status === 'thinking'}
        aria-label={statusText}
        className={`orb ${status === 'listening' ? 'listening' : ''} ${status === 'thinking' ? 'opacity-60 cursor-not-allowed' : ''}`}
        style={{ border: 'none', background: 'none', padding: 0 }}
      />

      {/* Call controls */}
      <div className="flex items-center gap-3">
        {isConnected ? (
          <button
            onClick={disconnect}
            className="flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-4 py-2 text-red-400 text-xs font-medium hover:bg-red-500/30 transition"
          >
            <PhoneOff className="h-3.5 w-3.5" /> End call
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={status === 'thinking'}
            className="flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition disabled:opacity-40"
          >
            <Phone className="h-3.5 w-3.5" /> Start call
          </button>
        )}
      </div>

      {/* Status */}
      <p className="text-stone-400 text-sm text-center" aria-live="polite">
        {statusText}
      </p>

      {/* Live transcript */}
      <div className="w-full max-w-md flex flex-col gap-2 flex-1 overflow-y-auto py-2">
        <AnimatePresence initial={false}>
          {transcript.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className={t.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[85%]'}
            >
              <div
                className={
                  t.role === 'user'
                    ? 'rounded-2xl rounded-tr-md bg-orange-600/90 text-white px-4 py-2 text-sm'
                    : 'rounded-2xl rounded-tl-md bg-stone-800 text-stone-200 px-4 py-2 text-sm border border-stone-700/50'
                }
              >
                {t.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isConnected && status === 'speaking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="self-start max-w-[85%]"
          >
            <div className="rounded-2xl rounded-tl-md bg-stone-800 text-stone-400 px-4 py-2 text-sm border border-stone-700/50 flex items-center gap-1.5">
              <span className="dm-dot w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animationDelay: '0s' }} />
              <span className="dm-dot w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animationDelay: '0.2s' }} />
              <span className="dm-dot w-1.5 h-1.5 rounded-full bg-orange-400" style={{ animationDelay: '0.4s' }} />
            </div>
          </motion.div>
        )}
        {isConnected && status === 'listening' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="self-end max-w-[85%]"
          >
            <div className="rounded-2xl rounded-tr-md bg-stone-800 text-stone-400 px-4 py-2 text-sm border border-stone-700/50 flex items-center gap-1.5">
              <VolumeListening />
              <span className="text-stone-500 text-xs">सुन रहा हूँ…</span>
            </div>
          </motion.div>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs text-center max-w-xs">{error}</p>
      )}

      {/* Backend hint */}
      <p className="text-stone-600 text-[10px] text-center max-w-xs mt-auto">
        Powered by Vapi · Your voice goes to DhanMitra's backend
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WEB SPEECH API — COMMENTED OUT (kept for reference / fallback)
   ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sendChatMessage } from '@/lib/api';
import { speak, startRecognition, stopRecognition, requestMicPermission } from '@/lib/voice';

const PROMPTS = { ... same as above ... };
const GREETINGS = { ... same as above ... };

export default function VoiceOrb() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const lang = profile.language || 'hindi';
  const p = PROMPTS[lang] || PROMPTS.hindi;

  const [status, setStatus] = useState('idle');
  const [lastReply, setLastReply] = useState(GREETINGS[lang]);
  const [micAllowed, setMicAllowed] = useState(true);
  const sessionId = useRef(`orb-${user?.id}-${Date.now()}`);
  const recSessionRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    setTimeout(() => speak(GREETINGS[lang], lang, { onStart: () => setStatus('speaking'), onEnd: () => setStatus('idle') }), 800);
  }, []);

  const startListening = async () => {
    try {
      await requestMicPermission();
    } catch {
      setMicAllowed(false);
      speak(lang === 'hindi' ? 'माइक्रोफोन की अनुमति दें।' : 'Please allow microphone access.', lang);
      return;
    }

    transcriptRef.current = '';
    const session = startRecognition({
      lang,
      continuous: true,
      interimResults: true,
      onInterim: (text) => { transcriptRef.current = text; setLastReply(text); },
      onError: (e) => { console.error('Recognition error:', e); setStatus('idle'); },
      onFinal: () => {},
    });

    if (!session) { speak('Voice not supported. Please use Chrome.', 'english'); return; }

    recSessionRef.current = session;
    setStatus('listening');

    session.ended.then((text) => {
      recSessionRef.current = null;
      if (text.trim()) { transcriptRef.current = text.trim(); sendMessage(text.trim()); }
      else setStatus('idle');
    });
  };

  const stopListening = () => { stopRecognition(recSessionRef.current); recSessionRef.current = null; };

  const sendMessage = async (text) => {
    setStatus('thinking');
    setLastReply(text);
    try {
      const data = await sendChatMessage({ message: text, mode: 'voice_only', sessionId: sessionId.current, userId: user?.id, profile });
      setLastReply(data.reply);
      speak(data.reply, lang, { onStart: () => setStatus('speaking'), onEnd: () => setStatus('idle') });
    } catch {
      const err = lang === 'hindi' ? 'क्षमा करें, कोई समस्या आई। फिर से कोशिश करें।' : 'Sorry, something went wrong. Please try again.';
      setLastReply(err);
      speak(err, lang, { onStart: () => setStatus('speaking'), onEnd: () => setStatus('idle') });
    }
  };

  const handleOrbClick = () => {
    if (status === 'thinking' || status === 'speaking') return;
    if (status === 'listening') stopListening();
    else startListening();
  };

  // ... same render JSX ...
}

   ═══════════════════════════════════════════════════════════════ */
