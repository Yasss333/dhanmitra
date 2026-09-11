import { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// Create the context
const UserProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  name: '',
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
  // mirrored Mongo (snake_case preserved for backend round-trips)
  monthly_income: null,
  monthly_expenses: null,
  savings_goal_amount: null,
  goals: [],
  loans: [],
  sips: [],
  notes: '',
  riskProfile: 'conservative',
}

// Map Mongo (snake_case) doc onto the camelCase context shape.
function fromMongo(doc) {
  if (!doc) return {}
  console.log('[UserProfileContext] Loading from MongoDB:', doc)
  return {
    name: doc.name || '',
    language: doc.language || null,
    occupation: doc.occupation || null,
    moneyComfort: doc.money_comfort || null,
    money_comfort: doc.money_comfort || null, // Add both for compatibility
    accessibilityMode: doc.accessibility_mode || 'normal',
    goal: doc.goal || null,
    onboardingComplete: doc.onboarding_complete || false,
    fitnessScore: doc.financial_fitness_score || doc.fitnessScore || 0,
    fitnessLevel: doc.fitness_level || doc.fitnessLevel || 'beginner',
    fitnessStreak: doc.fitness_streak || doc.fitnessStreak || 0,
    lastFitnessDate: doc.fitness_last_date || null,
    monthly_income: doc.monthly_income ?? null,
    monthly_expenses: doc.monthly_expenses ?? null,
    savings_goal_amount: doc.savings_goal_amount ?? null,
    goals: Array.isArray(doc.goals) ? doc.goals : [],
    loans: Array.isArray(doc.loans) ? doc.loans : [],
    sips: Array.isArray(doc.sips) ? doc.sips : [],
    notes: doc.notes || '',
    riskProfile: doc.risk_profile || 'conservative',
  }
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

    // TEMP-DEV: print the Clerk user id so it can be used to seed the demo profile.
    // eslint-disable-next-line no-console
    console.log('[UserProfileContext] Clerk user id for seeding:', user.id)

    // 1) Fast start from cached localStorage
    let local = DEFAULT_PROFILE
    try {
      const stored = localStorage.getItem(`dhanmitra_profile_${user.id}`)
      local = stored ? { ...DEFAULT_PROFILE, ...JSON.parse(stored) } : DEFAULT_PROFILE
      console.log('[UserProfileContext] Loaded from localStorage:', local)
    } catch {
      /* ignore */
    }
    setProfile(local)
    setProfileLoaded(true)

    // 2) Server-side seeded profile is the source of truth -> merge in
    console.log('[UserProfileContext] Fetching from backend for user:', user.id)
    fetch(`${API_BASE}/api/profile/${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((doc) => {
        console.log('[UserProfileContext] Backend response:', doc)
        const server = fromMongo(doc)
        const merged = { ...local, ...server }
        console.log('[UserProfileContext] Merged profile:', merged)
        setProfile(merged)
        try {
          localStorage.setItem(`dhanmitra_profile_${user.id}`, JSON.stringify(merged))
        } catch {
          /* ignore */
        }
      })
      .catch((error) => {
        console.error('[UserProfileContext] Error fetching profile:', error)
        /* keep local-only on network failure */
      })
  }, [isLoaded, user])

  const updateProfile = (updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates }
      if (user) {
        try {
          localStorage.setItem(`dhanmitra_profile_${user.id}`, JSON.stringify(next))
        } catch {
          /* ignore */
        }
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
