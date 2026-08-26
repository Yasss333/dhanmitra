import { useState, useEffect } from 'react';
import { useUserProfile } from '@/context/UserProfileContext';

const PERSONAS = {
  farmer: {
    occupation: 'farmer',
    language: 'hindi',
    moneyComfort: 'beginner',
    goal: 'emergency_fund',
    label: '🌾 Farmer (Ramesh)',
  },
  gig_worker: {
    occupation: 'gig_worker',
    language: 'hindi',
    moneyComfort: 'intermediate',
    goal: 'emergency_fund',
    label: '🛵 Gig Worker (Priya)',
  },
  homemaker: {
    occupation: 'homemaker',
    language: 'marathi',
    moneyComfort: 'beginner',
    goal: 'children_education',
    label: '🏠 Homemaker (Sneha)',
  },
  salaried: {
    occupation: 'salaried',
    language: 'english',
    moneyComfort: 'advanced',
    goal: 'retirement',
    label: '💼 Salaried (Arjun)',
  },
};

export default function PersonaSwitcher() {
  const { profile, updateProfile } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [timeoutId, setTimeoutId] = useState(null);

  // Hidden trigger: Double-click the logo 3 times quickly
  const handleLogoClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);
    
    if (timeoutId) clearTimeout(timeoutId);
    
    const id = setTimeout(() => setClicks(0), 2000);
    setTimeoutId(id);
    
    if (newClicks >= 3) {
      setIsOpen(!isOpen);
      setClicks(0);
    }
  };

  const switchPersona = (key) => {
    const persona = PERSONAS[key];
    updateProfile({
      occupation: persona.occupation,
      language: persona.language,
      moneyComfort: persona.moneyComfort,
      goal: persona.goal,
      onboardingComplete: true,
    });
    setIsOpen(false);
    // Refresh the page to reflect changes in the UI
    window.location.reload(); 
  };

  return (
    <div className="relative inline-block">
      {/* Hidden trigger: Click the logo */}
      <div onClick={handleLogoClick} className="cursor-pointer select-none">
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">₹</span>
        </div>
      </div>

      {/* Dropdown panel (hidden unless toggled) */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
            <p className="text-xs text-slate-400 font-medium">🎭 Persona Switcher</p>
            <p className="text-[10px] text-slate-500">Current: {profile.occupation || 'None'}</p>
          </div>
          <div className="py-1">
            {Object.entries(PERSONAS).map(([key, persona]) => (
              <button
                key={key}
                onClick={() => switchPersona(key)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-700/50 transition-colors flex items-center gap-2 ${
                  profile.occupation === persona.occupation 
                    ? 'text-orange-400 bg-orange-500/10' 
                    : 'text-slate-300'
                }`}
              >
                <span className="text-base">{persona.label.split(' ')[0]}</span>
                <span className="text-slate-400 text-xs">{persona.label.split(' ').slice(1).join(' ')}</span>
                {profile.occupation === persona.occupation && (
                  <span className="ml-auto text-[10px] text-orange-400">● Active</span>
                )}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 bg-slate-900/50 border-t border-slate-700 text-[10px] text-slate-500">
            💡 Switch personas instantly (no logout)
          </div>
        </div>
      )}
    </div>
  );
}