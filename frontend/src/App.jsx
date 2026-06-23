import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import LandingPage from './pages/LandingPage'
import OnboardingPage from './pages/OnboardingPage'
import HomeScreen from './pages/HomeScreen'
import ChatPage from './pages/ChatPage'
import VoiceOrb from './pages/VoiceOrb'
import { useUserProfile } from './context/UserProfileContext'

function ProtectedRoute({ children }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

function OnboardingGate({ children }) {
  const { profile, profileLoaded } = useUserProfile()
  if (!profileLoaded) return null
  if (!profile.onboardingComplete) return <Navigate to="/onboarding" replace />
  if (profile.accessibilityMode === 'voice_only') return <Navigate to="/orb" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <HomeScreen />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <OnboardingGate>
              <ChatPage />
            </OnboardingGate>
          </ProtectedRoute>
        }
      />
      <Route
        path="/orb"
        element={
          <ProtectedRoute>
            <VoiceOrb />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}