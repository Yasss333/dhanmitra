import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNavigate } from 'react-router-dom';      // <-- Required for back button
import { ArrowLeft } from 'lucide-react';           // <-- The back icon
import { sendChatMessage } from '@/lib/api';

const PROMPTS = {
  hindi:   { tap: 'बोलने के लिए गोले को दबाएँ', listening: 'सुन रहा हूँ... छोड़ें', thinking: 'सोच रहा हूँ...', speaking: 'बोल रहा हूँ...' },
  marathi: { tap: 'बोलण्यासाठी दाबा', listening: 'ऐकतोय... सोडा', thinking: 'विचार करतोय...', speaking: 'बोलतोय...' },
  kannada: { tap: 'ಒತ್ತಿ ಮಾತನಾಡಿ', listening: 'ಕೇಳುತ್ತಿದ್ದೇನೆ... ಬಿಡಿ', thinking: 'ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...', speaking: 'ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ...' },
  english: { tap: 'Tap to speak', listening: 'Listening... release', thinking: 'Thinking...', speaking: 'Speaking...' },
};

const GREETINGS = {
  hindi:   'नमस्ते! मैं धनमित्र हूँ। गोले को दबाकर अपना सवाल पूछें।',
  marathi: 'नमस्कार! मी धनमित्र आहे. गोळ्याला दाबून प्रश्न विचारा.',
  kannada: 'ನಮಸ್ಕಾರ! ನಾನು ಧನಮಿತ್ರ. ಗೋಳ ಒತ್ತಿ ಕೇಳಿ.',
  english: 'Hello! I am DhanMitra. Tap the orb and ask your question.',
};

const LANG_CODE = {
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  kannada: 'kn-IN',
  english: 'en-IN',
};

export default function VoiceOrb() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const navigate = useNavigate(); // <-- Initialize navigation

  const lang = profile.language || 'hindi';
  const p = PROMPTS[lang] || PROMPTS.hindi;

  const [status, setStatus] = useState('idle');
  const [lastReply, setLastReply] = useState(GREETINGS[lang]);
  const [micAllowed, setMicAllowed] = useState(true);
  const sessionId = useRef(`orb-${user?.id}-${Date.now()}`);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');

  // Speak on mount
  useEffect(() => {
    setTimeout(() => speakText(GREETINGS[lang]), 800);
  }, []);

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const buildAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const code = LANG_CODE[lang] || 'hi-IN';
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = code;
      utt.rate = 0.88;
      let voice = voices.find((v) => v.lang === code);
      if (!voice) voice = voices.find((v) => v.lang.startsWith(code.split('-')[0]));
      if (voice) utt.voice = voice;
      utt.onstart = () => setStatus('speaking');
      utt.onend = () => setStatus('idle');
      utt.onerror = () => setStatus('idle');
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      buildAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        buildAndSpeak();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  };

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicAllowed(false);
      speakText(lang === 'hindi' ? 'माइक्रोफोन की अनुमति दें।' : 'Please allow microphone access.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speakText('Voice not supported. Please use Chrome.');
      return;
    }

    transcriptRef.current = '';
    const recognition = new SpeechRecognition();
    recognition.lang = LANG_CODE[lang] || 'hi-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      transcriptRef.current = text;
      setLastReply(text);
    };

    recognition.onerror = (e) => {
      console.error('Recognition error:', e.error);
      setStatus('idle');
    };

    recognition.onend = () => {
      if (transcriptRef.current.trim()) {
        sendMessage(transcriptRef.current.trim());
      } else {
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStatus('listening');
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const sendMessage = async (text) => {
    setStatus('thinking');
    setLastReply(text);
    try {
      const data = await sendChatMessage({
        message: text,
        mode: 'voice_only',
        sessionId: sessionId.current,
        userId: user?.id,
        profile,
      });
      setLastReply(data.reply);
      speakText(data.reply);
    } catch {
      const err = lang === 'hindi'
        ? 'क्षमा करें, कोई समस्या आई। फिर से कोशिश करें।'
        : 'Sorry, something went wrong. Please try again.';
      setLastReply(err);
      speakText(err);
    }
  };

  const handleOrbClick = () => {
    if (status === 'thinking' || status === 'speaking') return;
    if (status === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const statusText = {
    idle: p.tap,
    listening: p.listening,
    thinking: p.thinking,
    speaking: p.speaking,
  }[status];

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-8 px-6 relative">
      
      {/* 👇 THE BACK BUTTON (VISIBLE & ACCESSIBLE) 👇 */}
      <button
        onClick={() => navigate('/home')}
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

      {/* Status */}
      <p className="text-stone-400 text-sm text-center" aria-live="polite">
        {statusText}
      </p>

      {/* Live transcript / last reply */}
      {lastReply && (
        <div className="max-w-sm bg-stone-900 rounded-2xl px-5 py-3 text-center">
          <p className="text-stone-300 text-sm leading-relaxed">{lastReply}</p>
        </div>
      )}

      {!micAllowed && (
        <p className="text-red-400 text-xs text-center max-w-xs">
          {lang === 'hindi'
            ? 'माइक्रोफोन की अनुमति नहीं है। ब्राउज़र सेटिंग्स में माइक चालू करें।'
            : 'Microphone access denied. Enable it in browser settings.'}
        </p>
      )}
    </div>
  );
}