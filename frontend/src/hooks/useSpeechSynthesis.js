const LANG_CODE = {
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  kannada: 'kn-IN',
  english: 'en-IN',
}

function getBestVoice(lang) {
  const voices = window.speechSynthesis.getVoices()
  const code = LANG_CODE[lang] || 'hi-IN'

  // Try exact match first
  let voice = voices.find((v) => v.lang === code)
  // Try partial match (e.g. 'hi' matches 'hi-IN')
  if (!voice) voice = voices.find((v) => v.lang.startsWith(code.split('-')[0]))
  // Fallback to any Indian English
  if (!voice) voice = voices.find((v) => v.lang === 'en-IN')
  return voice || null
}

export function useSpeechSynthesis(language = 'english') {
  const speak = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = LANG_CODE[language] || 'hi-IN'
    utter.rate = 0.88

    const voices = window.speechSynthesis.getVoices()

    if (voices.length > 0) {
      const voice = getBestVoice(language)
      if (voice) utter.voice = voice
      window.speechSynthesis.speak(utter)
    } else {
      // Voices not loaded yet — wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        const voice = getBestVoice(language)
        if (voice) utter.voice = voice
        window.speechSynthesis.speak(utter)
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }

  const stop = () => {
    window.speechSynthesis?.cancel()
  }

  return { speak, stop, isSpeaking: false }
}