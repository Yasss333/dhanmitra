import { useState } from 'react'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { useUserProfile } from '@/context/UserProfileContext'

export default function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false)

  return (
    <>
      <SignedOut>
        <div className="min-h-screen rupee-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">

          {/* decorative circles */}
          <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-orange-100 opacity-60" />
          <div className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full bg-green-100 opacity-50" />
          <div className="absolute top-1/3 left-[-40px] w-32 h-32 rounded-full bg-yellow-100 opacity-40" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">

            {/* Logo */}
            <div className="mb-6 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg mb-3">
                <span className="text-white text-4xl font-bold">₹</span>
              </div>
              <h1 className="text-4xl font-bold text-orange-600 tracking-tight">DhanMitra</h1>
              <p className="text-slate-500 text-sm mt-1">धन का साथी — Financial Companion for Bharat</p>
            </div>

            {/* taglines */}
            <div className="space-y-2 mb-8">
              <p className="text-base text-slate-700 font-medium">
                आपका पैसा, आपकी भाषा, आपकी शर्तें
              </p>
              <p className="text-sm text-slate-500">
                Your money. Your language. Your terms.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['🌾 Farmers', '🛵 Gig Workers', '🏠 Homemakers', '📚 Students'].map((f) => (
                <span key={f} className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-full text-xs text-orange-700 font-medium">
                  {f}
                </span>
              ))}
            </div>

            {!showSignIn ? (
              <button
                onClick={() => setShowSignIn(true)}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-2xl shadow-md transition-all active:scale-95"
              >
                शुरू करें — Get Started
              </button>
            ) : (
              <div className="w-full">
                <SignIn routing="hash" afterSignInUrl="/onboarding" />
              </div>
            )}

            <p className="text-xs text-slate-400 mt-6">
              Free • No hidden charges • Built for Bharat
            </p>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <RedirectAfterSignIn />
      </SignedIn>
    </>
  )
}

function RedirectAfterSignIn() {
  const { profile, profileLoaded } = useUserProfile()
  if (!profileLoaded) return null
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />
  if (profile.accessibilityMode === 'voice_only') return <Navigate to="/orb" replace />
  return <Navigate to="/home" replace />
}