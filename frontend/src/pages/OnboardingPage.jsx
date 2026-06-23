import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserProfile } from '@/context/UserProfileContext'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'

const TRANSLATIONS = {
  hindi: {
    q2: 'आप किस तरह के व्यक्ति हैं?',
    q3: 'क्या आपको कोई विशेष जरूरत है?',
    q4: 'आप पैसों के बारे में कितना जानते हैं?',
    normal: 'मैं सामान्य रूप से ऐप इस्तेमाल कर सकता/सकती हूँ',
    low_vision: 'मुझे बड़े अक्षर चाहिए / कम दिखता है',
    voice_only: 'मैं देख नहीं सकता/सकती — सिर्फ आवाज़ चाहिए',
    low: 'बहुत कम पता है',
    medium: 'थोड़ा पता है',
    high: 'मैं अच्छे से समझता/समझती हूँ',
    continue: 'आगे बढ़ें',
  },
  marathi: {
    q2: 'तुम्ही कोणत्या प्रकारचे व्यक्ती आहात?',
    q3: 'तुम्हाला काही विशेष गरज आहे का?',
    q4: 'तुम्हाला पैशांबद्दल किती माहिती आहे?',
    normal: 'मी सामान्यपणे ॲप वापरू शकतो/शकते',
    low_vision: 'मला मोठे अक्षरे हवे / कमी दिसते',
    voice_only: 'मला दिसत नाही — फक्त आवाज हवा',
    low: 'फार कमी माहिती आहे',
    medium: 'थोडी माहिती आहे',
    high: 'मला चांगले समजते',
    continue: 'पुढे जा',
  },
  kannada: {
    q2: 'ನೀವು ಯಾವ ರೀತಿಯ ವ್ಯಕ್ತಿ?',
    q3: 'ನಿಮಗೆ ಯಾವುದಾದರೂ ವಿಶೇಷ ಅಗತ್ಯವಿದೆಯೇ?',
    q4: 'ನಿಮಗೆ ಹಣದ ಬಗ್ಗೆ ಎಷ್ಟು ತಿಳಿದಿದೆ?',
    normal: 'ನಾನು ಸಾಮಾನ್ಯವಾಗಿ ಆ್ಯಪ್ ಬಳಸಬಲ್ಲೆ',
    low_vision: 'ನನಗೆ ದೊಡ್ಡ ಅಕ್ಷರ ಬೇಕು / ಕಡಿಮೆ ಕಾಣುತ್ತದೆ',
    voice_only: 'ನನಗೆ ಕಾಣುವುದಿಲ್ಲ — ಧ್ವನಿ ಮಾತ್ರ ಬೇಕು',
    low: 'ತುಂಬಾ ಕಡಿಮೆ ಗೊತ್ತು',
    medium: 'ಸ್ವಲ್ಪ ಗೊತ್ತು',
    high: 'ನನಗೆ ಚೆನ್ನಾಗಿ ಅರ್ಥವಾಗುತ್ತದೆ',
    continue: 'ಮುಂದುವರಿಸಿ',
  },
  english: {
    q2: 'What best describes you?',
    q3: 'Do you have any special needs?',
    q4: 'How much do you know about finances?',
    normal: 'I can use the app normally',
    low_vision: 'I prefer larger text / low vision',
    voice_only: 'I cannot see — I need voice only',
    low: 'Very little',
    medium: 'I know the basics',
    high: 'I understand finances well',
    continue: 'Continue',
  },
}

const OCCUPATIONS = {
  hindi:   [{ v:'farmer', e:'🌾', l:'किसान' }, { v:'gig_worker', e:'🛵', l:'डिलीवरी / गिग' }, { v:'homemaker', e:'🏠', l:'गृहिणी' }, { v:'business_owner', e:'🏪', l:'छोटा व्यापार' }, { v:'student', e:'📚', l:'विद्यार्थी' }, { v:'salaried', e:'💼', l:'नौकरी' }],
  marathi: [{ v:'farmer', e:'🌾', l:'शेतकरी' }, { v:'gig_worker', e:'🛵', l:'डिलिव्हरी / गिग' }, { v:'homemaker', e:'🏠', l:'गृहिणी' }, { v:'business_owner', e:'🏪', l:'छोटा व्यवसाय' }, { v:'student', e:'📚', l:'विद्यार्थी' }, { v:'salaried', e:'💼', l:'नोकरी' }],
  kannada: [{ v:'farmer', e:'🌾', l:'ರೈತ' }, { v:'gig_worker', e:'🛵', l:'ಡೆಲಿವರಿ / ಗಿಗ್' }, { v:'homemaker', e:'🏠', l:'ಗೃಹಿಣಿ' }, { v:'business_owner', e:'🏪', l:'ಸಣ್ಣ ವ್ಯಾಪಾರ' }, { v:'student', e:'📚', l:'ವಿದ್ಯಾರ್ಥಿ' }, { v:'salaried', e:'💼', l:'ಉದ್ಯೋಗ' }],
  english: [{ v:'farmer', e:'🌾', l:'Farmer' }, { v:'gig_worker', e:'🛵', l:'Gig / Delivery' }, { v:'homemaker', e:'🏠', l:'Homemaker' }, { v:'business_owner', e:'🏪', l:'Small Business' }, { v:'student', e:'📚', l:'Student' }, { v:'salaried', e:'💼', l:'Salaried' }],
}

const VOICE_GREETINGS = {
  hindi:   'नमस्ते, मैं धनमित्र हूँ। आप कौनसी भाषा में बात करना चाहेंगे?',
  marathi: 'नमस्कार, मी धनमित्र आहे. तुम्ही कोणत्या भाषेत बोलणे पसंत कराल?',
  kannada: 'ನಮಸ್ಕಾರ, ನಾನು ಧನಮಿತ್ರ. ನೀವು ಯಾವ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಲು ಬಯಸುತ್ತೀರಿ?',
  english: 'Hello, I am DhanMitra. Which language would you like to speak in?',
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [language, setLanguage] = useState(null)
  const [occupation, setOccupation] = useState(null)
  const [accessibility, setAccessibility] = useState(null)
  const [moneyComfort, setMoneyComfort] = useState(null)
  const { updateProfile } = useUserProfile()
  const navigate = useNavigate()
  const { speak } = useSpeechSynthesis(language || 'hindi')

  // Speak greeting on mount
  useEffect(() => {
    speak(VOICE_GREETINGS.hindi)
  }, [])

  const t = TRANSLATIONS[language] || TRANSLATIONS.english
  const occs = OCCUPATIONS[language] || OCCUPATIONS.english

  const handleLanguage = (lang) => {
    setLanguage(lang)
    // Speak next question in chosen language
    setTimeout(() => speak(TRANSLATIONS[lang].q2), 400)
    setStep(2)
  }

  const handleOccupation = (occ) => {
    setOccupation(occ)
    setTimeout(() => speak(t.q3), 400)
    setStep(3)
  }

  const handleAccessibility = (mode) => {
    setAccessibility(mode)
    if (mode === 'voice_only') {
      // Save profile and go straight to orb
      updateProfile({
        language,
        occupation,
        accessibilityMode: 'voice_only',
        moneyComfort: 'beginner',
        onboardingComplete: true,
      })
      navigate('/orb')
      return
    }
    setTimeout(() => speak(t.q4), 400)
    setStep(4)
  }

  const handleMoneyComfort = (level) => {
    setMoneyComfort(level)
    updateProfile({
      language,
      occupation,
      accessibilityMode: accessibility,
      moneyComfort: level,
      onboardingComplete: true,
    })
    navigate('/home')
  }

  return (
    <div className="min-h-screen rupee-bg flex flex-col items-center justify-center px-4">

      {/* Logo strip */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow">
          <span className="text-white text-xl font-bold">₹</span>
        </div>
        <span className="text-2xl font-bold text-orange-600">DhanMitra</span>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {[1,2,3,4].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-orange-500' : s < step ? 'w-4 bg-orange-300' : 'w-4 bg-slate-200'}`}
          />
        ))}
      </div>

      {/* ── STEP 1: Language ── */}
      {step === 1 && (
        <div className="w-full max-w-sm">
          <p className="text-center text-slate-600 mb-2 text-sm">Namaste / नमस्ते / नमस्कार / ನಮಸ್ಕಾರ</p>
          <h2 className="text-xl font-bold text-center text-slate-800 mb-6">
            आप कौनसी भाषा चाहते हैं?<br/>
            <span className="text-base font-normal text-slate-500">Which language do you prefer?</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'hindi',   l: 'हिंदी',    sub: 'Hindi' },
              { v: 'marathi', l: 'मराठी',    sub: 'Marathi' },
              { v: 'kannada', l: 'ಕನ್ನಡ',   sub: 'Kannada' },
              { v: 'english', l: 'English',  sub: 'अंग्रेज़ी' },
            ].map((lang) => (
              <button
                key={lang.v}
                onClick={() => handleLanguage(lang.v)}
                className="py-5 rounded-2xl border-2 border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95 flex flex-col items-center gap-1 shadow-sm"
              >
                <span className="text-xl font-bold text-slate-800">{lang.l}</span>
                <span className="text-xs text-slate-400">{lang.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2: Occupation ── */}
      {step === 2 && (
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-6">{t.q2}</h2>
          <div className="grid grid-cols-2 gap-3">
            {occs.map((occ) => (
              <button
                key={occ.v}
                onClick={() => handleOccupation(occ.v)}
                className="py-5 rounded-2xl border-2 border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95 flex flex-col items-center gap-2 shadow-sm"
              >
                <span className="text-3xl">{occ.e}</span>
                <span className="text-sm font-semibold text-slate-700">{occ.l}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 3: Accessibility ── */}
      {step === 3 && (
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-6">{t.q3}</h2>
          <div className="flex flex-col gap-3">
            {[
              { v: 'normal',     e: '👁️',  l: t.normal },
              { v: 'low_vision', e: '🔍',  l: t.low_vision },
              { v: 'voice_only', e: '🎙️', l: t.voice_only },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => handleAccessibility(opt.v)}
                className="py-4 px-5 rounded-2xl border-2 border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95 flex items-center gap-4 shadow-sm"
              >
                <span className="text-2xl">{opt.e}</span>
                <span className="text-sm font-semibold text-slate-700 text-left">{opt.l}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 4: Money comfort ── */}
      {step === 4 && (
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-6">{t.q4}</h2>
          <div className="flex flex-col gap-3">
            {[
              { v: 'beginner',     e: '🌱', l: t.low },
              { v: 'intermediate', e: '📈', l: t.medium },
              { v: 'advanced',     e: '🏆', l: t.high },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => handleMoneyComfort(opt.v)}
                className="py-4 px-5 rounded-2xl border-2 border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95 flex items-center gap-4 shadow-sm"
              >
                <span className="text-2xl">{opt.e}</span>
                <span className="text-sm font-semibold text-slate-700">{opt.l}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}   