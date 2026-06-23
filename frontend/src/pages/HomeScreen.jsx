import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { UserButton } from '@clerk/clerk-react'
import { useUserProfile } from '@/context/UserProfileContext'
import { Mic } from 'lucide-react'

const NUDGES = {
  farmer: {
    hindi:   { text: 'PM-KISAN के लिए पंजीकरण खुला है — आप पात्र हो सकते हैं', action: 'जानें', query: 'PM-KISAN scheme eligibility' },
    marathi: { text: 'PM-KISAN नोंदणी सुरू आहे — तुम्ही पात्र असू शकता', action: 'जाणून घ्या', query: 'PM-KISAN scheme eligibility' },
    kannada: { text: 'PM-KISAN ನೋಂದಣಿ ತೆರೆದಿದೆ — ನೀವು ಅರ್ಹರಾಗಿರಬಹುದು', action: 'ತಿಳಿಯಿರಿ', query: 'PM-KISAN scheme eligibility' },
    english: { text: 'PM-KISAN registrations are open — you may qualify', action: 'Learn more', query: 'PM-KISAN scheme eligibility' },
  },
  gig_worker: {
    hindi:   { text: 'इस हफ्ते आमदनी दर्ज करें — अपनी बचत ट्रैक करें', action: 'दर्ज करें', query: 'help me log my income this week' },
    marathi: { text: 'या आठवड्यात उत्पन्न नोंदवा — बचत ट्रॅक करा', action: 'नोंदवा', query: 'help me log my income this week' },
    kannada: { text: 'ಈ ವಾರ ಆದಾಯ ದಾಖಲಿಸಿ — ಉಳಿತಾಯ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ', action: 'ದಾಖಲಿಸಿ', query: 'help me log my income this week' },
    english: { text: "Log this week's income — track your savings", action: 'Log now', query: 'help me log my income this week' },
  },
  homemaker: {
    hindi:   { text: 'PM उज्ज्वला योजना — मुफ्त LPG कनेक्शन के लिए पात्रता जाँचें', action: 'जाँचें', query: 'PM Ujjwala Yojana eligibility' },
    marathi: { text: 'PM उज्ज्वला योजना — मोफत LPG कनेक्शनसाठी पात्रता तपासा', action: 'तपासा', query: 'PM Ujjwala Yojana eligibility' },
    kannada: { text: 'PM ಉಜ್ಜ್ವಲ ಯೋಜನೆ — ಉಚಿತ LPG ಸಂಪರ್ಕಕ್ಕಾಗಿ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ', action: 'ಪರಿಶೀಲಿಸಿ', query: 'PM Ujjwala Yojana eligibility' },
    english: { text: 'PM Ujjwala Yojana — check eligibility for free LPG connection', action: 'Check now', query: 'PM Ujjwala Yojana eligibility' },
  },
  student: {
    hindi:   { text: 'आज की वित्तीय चुनौती तैयार है — 60 सेकंड में पूरी करें', action: 'शुरू करें', query: 'give me a financial fitness challenge' },
    marathi: { text: 'आजचे आर्थिक आव्हान तयार आहे — 60 सेकंदात पूर्ण करा', action: 'सुरू करा', query: 'give me a financial fitness challenge' },
    kannada: { text: 'ಇಂದಿನ ಹಣಕಾಸು ಸವಾಲು ಸಿದ್ಧವಾಗಿದೆ — 60 ಸೆಕೆಂಡ್‌ನಲ್ಲಿ ಮುಗಿಸಿ', action: 'ಪ್ರಾರಂಭಿಸಿ', query: 'give me a financial fitness challenge' },
    english: { text: "Today's financial challenge is ready — complete in 60 seconds", action: 'Start', query: 'give me a financial fitness challenge' },
  },
  salaried: {
    hindi:   { text: 'अपने निवेश विकल्प जानें — PPF, NPS, या म्यूचुअल फंड?', action: 'जानें', query: 'explain PPF NPS and mutual fund options for salaried person' },
    marathi: { text: 'तुमचे गुंतवणूक पर्याय जाणून घ्या — PPF, NPS, किंवा म्युच्युअल फंड?', action: 'जाणून घ्या', query: 'explain PPF NPS and mutual fund options for salaried person' },
    kannada: { text: 'ನಿಮ್ಮ ಹೂಡಿಕೆ ಆಯ್ಕೆಗಳನ್ನು ತಿಳಿಯಿರಿ — PPF, NPS, ಅಥವಾ ಮ್ಯೂಚುಯಲ್ ಫಂಡ್?', action: 'ತಿಳಿಯಿರಿ', query: 'explain PPF NPS and mutual fund options for salaried person' },
    english: { text: 'Know your investment options — PPF, NPS, or Mutual Funds?', action: 'Learn', query: 'explain PPF NPS and mutual fund options for salaried person' },
  },
  business_owner: {
    hindi:   { text: 'मुद्रा लोन — बिना गारंटी ₹10 लाख तक का कर्ज', action: 'जानें', query: 'PM Mudra loan eligibility and process' },
    marathi: { text: 'मुद्रा कर्ज — हमीशिवाय ₹10 लाखापर्यंत', action: 'जाणून घ्या', query: 'PM Mudra loan eligibility and process' },
    kannada: { text: 'ಮುದ್ರಾ ಸಾಲ — ಯಾವುದೇ ಖಾತರಿಯಿಲ್ಲದೆ ₹10 ಲಕ್ಷದವರೆಗೆ', action: 'ತಿಳಿಯಿರಿ', query: 'PM Mudra loan eligibility and process' },
    english: { text: 'Mudra Loan — up to ₹10 lakh with no collateral', action: 'Learn more', query: 'PM Mudra loan eligibility and process' },
  },
}

const GREET = {
  hindi:   'नमस्ते',
  marathi: 'नमस्कार',
  kannada: 'ನಮಸ್ಕಾರ',
  english: 'Hello',
}

const TALK_LABEL = {
  hindi:   'धनमित्र से बात करें',
  marathi: 'धनमित्राशी बोला',
  kannada: 'ಧನಮಿತ್ರರೊಂದಿಗೆ ಮಾತನಾಡಿ',
  english: 'Talk to DhanMitra',
}

const FITNESS_LABEL = {
  hindi:   "आज की वित्तीय चुनौती",
  marathi: "आजचे आर्थिक आव्हान",
  kannada: "ಇಂದಿನ ಹಣಕಾಸು ಸವಾಲು",
  english: "Today's Financial Challenge",
}

const LEVEL_NAMES = {
  beginner:     { hindi: 'शुरुआत', english: 'Beginner',  marathi: 'सुरुवात',  kannada: 'ಆರಂಭ' },
  aware:        { hindi: 'जागरूक', english: 'Aware',     marathi: 'जागरूक',   kannada: 'ಜಾಗೃತ' },
  smart:        { hindi: 'स्मार्ट', english: 'Smart',    marathi: 'स्मार्ट',  kannada: 'ಸ್ಮಾರ್ಟ್' },
  champion:     { hindi: 'चैंपियन', english: 'Champion', marathi: 'चॅम्पियन', kannada: 'ಚಾಂಪಿಯನ್' },
}

export default function HomeScreen() {
  const { user } = useUser()
  const { profile } = useUserProfile()
  const navigate = useNavigate()

  const lang = profile.language || 'english'
  const occ  = profile.occupation || 'gig_worker'

  const nudge = NUDGES[occ]?.[lang] || NUDGES['gig_worker']['english']
  const firstName = user?.firstName || user?.username || 'Friend'
  const level = profile.fitnessLevel || 'beginner'
  const levelName = LEVEL_NAMES[level]?.[lang] || level
  const streak = profile.fitnessStreak || 0
  const score = profile.fitnessScore || 0

  const handleNudge = () => {
    navigate('/chat', { state: { initialMessage: nudge.query } })
  }

  const handleChallenge = () => {
    navigate('/chat', { state: { initialMessage: 'give me a financial fitness challenge' } })
  }

  return (
    <div className="min-h-screen rupee-bg flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">₹</span>
          </div>
          <span className="font-bold text-orange-600 text-lg">DhanMitra</span>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Greeting */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-slate-800">
          {GREET[lang]}, {firstName} 👋
        </h1>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-4 overflow-y-auto">

        {/* Proactive nudge card */}
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-lg">💡</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700 leading-relaxed">{nudge.text}</p>
              <button
                onClick={handleNudge}
                className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700"
              >
                {nudge.action} →
              </button>
            </div>
          </div>
        </div>

        {/* Fitness card */}
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Financial Fitness</p>
              <p className="text-base font-bold text-slate-800">{FITNESS_LABEL[lang]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{streak} 🔥</p>
              <p className="text-sm font-bold text-green-600">{levelName}</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
          <button
            onClick={handleChallenge}
            className="w-full py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold hover:bg-green-100 transition-all active:scale-95"
          >
            ⚡ {lang === 'hindi' ? 'चुनौती लें' : lang === 'marathi' ? 'आव्हान घ्या' : lang === 'kannada' ? 'ಸವಾಲು ತೆಗೆದುಕೊಳ್ಳಿ' : 'Take challenge'}
          </button>
        </div>

        {/* Big talk button */}
        <button
          onClick={() => navigate('/chat')}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-md hover:from-orange-600 hover:to-orange-700 transition-all active:scale-95 flex items-center justify-center gap-3"
        >
          <Mic className="h-6 w-6" />
          {TALK_LABEL[lang]}
        </button>

      </div>
    </div>
  )
}