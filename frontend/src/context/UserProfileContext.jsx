import { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'

const UserProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  language: null,
  occupation: null,
  moneyComfort: null,
  accessibilityMode: 'normal', // 'normal' | 'low_vision' | 'voice_only'
  goal: null,
  inferredMode: null, // 'farmer' | 'gig' | 'homemaker' | 'student' | 'salaried' | 'business'
  onboardingComplete: false,
  fitnessScore: 0,
  fitnessLevel: 'beginner',
  fitnessStreak: 0,
  lastFitnessDate: null,
}

export function UserProfileProvider({ children }) {
  const { user, isLoaded } = useUser()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      setProfile(DEFAULT_PROFILE)
      setProfileLoaded(true)
      return
    }
    const stored = localStorage.getItem(`dhanmitra_profile_${user.id}`)
    setProfile(stored ? JSON.parse(stored) : DEFAULT_PROFILE)
    setProfileLoaded(true)
  }, [isLoaded, user])

  const updateProfile = (updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates }
      if (user) {
        localStorage.setItem(`dhanmitra_profile_${user.id}`, JSON.stringify(next))
      }
      return next
    })
  }

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile, profileLoaded }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext)
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider')
  return ctx
}