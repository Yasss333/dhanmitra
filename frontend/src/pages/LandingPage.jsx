import { useState } from 'react'
import { motion } from 'framer-motion'
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { useUserProfile } from '@/context/UserProfileContext'

export default function LandingPage() {
  const [showSignIn, setShowSignIn] = useState(false)

  return (
    <>
      <SignedOut>
        <div className="min-h-screen rupee-bg flex flex-col items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-green-50">

          {/* decorative circles */}
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ duration: 1 }}
            className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 blur-2xl" 
          />
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="absolute bottom-[-60px] left-[-60px] w-56 h-56 rounded-full bg-gradient-to-br from-green-200 to-green-300 blur-2xl" 
          />
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="absolute top-1/3 left-[-40px] w-32 h-32 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-300 blur-xl" 
          />

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
          >

            {/* Logo */}
            <div className="mb-6 flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-200/60 mb-4"
              >
                <span className="text-white text-5xl font-bold">₹</span>
              </motion.div>
              <h1 className="text-5xl font-bold text-orange-600 tracking-tight">DhanMitra</h1>
              <p className="text-slate-500 text-sm mt-2">धन का साथी — Financial Companion for Bharat</p>
            </div>

            {/* taglines */}
            <div className="space-y-2 mb-8">
              <p className="text-lg text-slate-700 font-medium">
                आपका पैसा, आपकी भाषा, आपकी शर्तें
              </p>
              <p className="text-sm text-slate-500">
                Your money. Your language. Your terms.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['🌾 Farmers', '🛵 Gig Workers', '🏠 Homemakers', '📚 Students'].map((f, i) => (
                <motion.span
                  key={f}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 + (i * 0.1) }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-full text-sm text-orange-700 font-medium shadow-sm hover:shadow-md transition-shadow"
                >
                  {f}
                </motion.span>
              ))}
            </div>

            {!showSignIn ? (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSignIn(true)}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-200/50 transition-all"
              >
                शुरू करें — Get Started
              </motion.button>
            ) : (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <SignIn routing="hash" afterSignInUrl="/onboarding" />
              </motion.div>
            )}

            <p className="text-xs text-slate-400 mt-6">
              Free • No hidden charges • Built for Bharat
            </p>
          </motion.div>
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