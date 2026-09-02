// Shared Web Speech utilities for DhanMitra voice (STT + TTS).
// Used by both the chat composer mic and the VoiceOrb.

export const LANG_CODE = {
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  kannada: 'kn-IN',
  english: 'en-IN',
};

export function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export async function requestMicPermission() {
  await navigator.mediaDevices.getUserMedia({ audio: true });
}

export function speak(text, lang = 'english', { rate = 0.88, onStart, onEnd } = {}) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();

  const buildAndSpeak = () => {
    const code = LANG_CODE[lang] || 'hi-IN';
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = code;
    utt.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    let voice = voices.find((v) => v.lang === code);
    if (!voice) voice = voices.find((v) => v.lang.startsWith(code.split('-')[0]));
    if (voice) utt.voice = voice;
    if (onStart) utt.onstart = onStart;
    utt.onend = () => onEnd && onEnd();
    utt.onerror = () => onEnd && onEnd();
    window.speechSynthesis.speak(utt);
  };

  if (window.speechSynthesis.getVoices().length > 0) {
    buildAndSpeak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      buildAndSpeak();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

/**
 * Start listening with the Web Speech API.
 * Accumulates interim + final transcripts and resolves the final transcript
 * on recognition end (call stopRecognition to end early).
 *
 * @returns {object} recognition instance (pass to stopRecognition)
 *   `ended` is a promise that resolves with the final transcript ('' if empty/error).
 */
export function startRecognition({
  lang = 'english',
  continuous = true,
  interimResults = true,
  onInterim = () => {},
  onFinal = () => {},
  onError = () => {},
} = {}) {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) {
    onError(new Error('Voice not supported. Please use Chrome.'));
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = LANG_CODE[lang] || 'hi-IN';
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;

  let transcript = '';
  let settled = false;

  const ended = new Promise((resolve) => {
    recognition.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      transcript = text.trim();
      if (interimResults) onInterim(text);
    };

    recognition.onerror = (e) => {
      onError(e);
      if (!settled) {
        settled = true;
        resolve('');
      }
    };

    recognition.onend = () => {
      if (!settled) {
        settled = true;
        resolve(transcript);
        if (transcript) onFinal(transcript);
      }
    };
  });

  recognition.start();
  return { recognition, ended };
}

export function stopRecognition(session) {
  if (session && session.recognition) {
    session.recognition.stop();
  }
}