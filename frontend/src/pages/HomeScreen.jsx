import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function HomeScreen() {
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.firstName || 'User';

  // 🔥 FETCH OR AUTO-CREATE PROFILE
  useEffect(() => {
    const fetchOrCreateProfile = async () => {
      if (!user) return;
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile/${user.id}`);
        
        if (res.status === 404) {
          // 🔥 PROFILE DOESN'T EXIST → CREATE IT!
          const defaultProfile = {
            user_id: user.id,
            language: profile?.language || 'english',
            occupation: profile?.occupation || 'gig_worker',
            money_comfort: profile?.moneyComfort || profile?.money_comfort || 'beginner',
            goal: profile?.goal || 'emergency_fund',
            onboarding_complete: profile?.onboardingComplete || true,
            fitnessScore: profile?.fitnessScore || 0,
            fitnessLevel: profile?.fitnessLevel || 'Beginner',
            fitnessStreak: profile?.fitnessStreak || 0,
          };
          
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(defaultProfile),
          });
          
          // Refetch after creation
          const retryRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile/${user.id}`);
          if (retryRes.ok) {
            const freshData = await retryRes.json();
            setData(freshData);
            // Sync context
            updateProfile({
              fitnessScore: freshData.fitnessScore || 0,
              fitnessLevel: freshData.fitnessLevel || 'Beginner',
              fitnessStreak: freshData.fitnessStreak || 0,
            });
          }
        } else if (res.ok) {
          const freshData = await res.json();
          setData(freshData);
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        // Fallback to context
        setData({
          fitnessScore: profile?.fitnessScore || 0,
          fitnessLevel: profile?.fitnessLevel || 'Beginner',
          fitnessStreak: profile?.fitnessStreak || 0,
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrCreateProfile();
  }, [user]);

  // Extract values
  const score = data?.fitnessScore ?? profile?.fitnessScore ?? 0;
  const level = data?.fitnessLevel ?? profile?.fitnessLevel ?? 'Beginner';
  const streak = data?.fitnessStreak ?? profile?.fitnessStreak ?? 0;
  
  // For savings goal – default or stored
  const savedAmount = data?.savedAmount ?? 0;
  const targetAmount = data?.targetAmount ?? 500;
  const progressPercent = Math.min(100, targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-[#73819E]">Loading your financial snapshot...</div>
        </div>
      </AppLayout>
    );
  }

  // Dynamic chart data (tied to score)
  const weekData = [
    { spend: Math.max(20, 60 - score * 0.2), save: Math.min(60, 30 + score * 0.3) },
    { spend: Math.max(20, 52 - score * 0.15), save: Math.min(60, 38 + score * 0.25) },
    { spend: Math.max(20, 46 - score * 0.1), save: Math.min(60, 48 + score * 0.2) },
    { spend: Math.max(20, 40 - score * 0.05), save: Math.min(60, 58 + score * 0.15) },
  ];
  const savingsTrend = weekData[weekData.length - 1].save - weekData[0].save;
  const trendText = savingsTrend > 0 ? `▲ Savings up ${Math.round(savingsTrend)}%` : `▼ Savings down ${Math.round(Math.abs(savingsTrend))}%`;
  const trendColor = savingsTrend > 0 ? 'text-green-600' : 'text-red-500';

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Hello, {firstName} 👋</h1>
          <p className="text-slate-500 text-sm mt-1">Here's your financial snapshot for today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 border border-orange-200 bg-orange-50 rounded-full text-sm font-medium text-orange-700 shadow-sm">
            🌐 {profile?.language || 'English'}
          </div>
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center font-bold text-white shadow-md shadow-orange-200/50">
            {firstName[0]}
          </div>
        </div>
      </div>

      {/* QUICK FACTS (Phase 3) */}
      {(data?.monthly_income || data?.monthly_expenses || data?.savings_goal_amount || data?.goals?.length > 0 || data?.loans?.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {data.monthly_income && (
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-sm">💰 Income: ₹{Number(data.monthly_income).toLocaleString('en-IN')}</span>
          )}
          {data.monthly_expenses && (
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-sm">🧾 Expenses: ₹{Number(data.monthly_expenses).toLocaleString('en-IN')}</span>
          )}
          {data.savings_goal_amount && (
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-sm">🎯 Goal: ₹{Number(data.savings_goal_amount).toLocaleString('en-IN')}</span>
          )}
          {(data.goals || []).slice(0, 2).map((g) => (
            <span key={g} className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 shadow-sm">🎯 {g}</span>
          ))}
          <button
            onClick={() => navigate('/profile')}
            className="ml-auto px-3 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline"
          >
            Edit profile →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* FITNESS GAUGE */}
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50 p-6 flex items-center gap-6 bg-gradient-to-br from-white to-orange-50/30 hover:shadow-xl transition-shadow duration-300">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-28 h-28 -rotate-90">
              <circle cx="56" cy="56" r="46" fill="none" stroke="#F1EADA" strokeWidth="10" />
              <circle 
                cx="56" cy="56" r="46" 
                fill="none" stroke="#FF6A1A" strokeWidth="10" 
                strokeLinecap="round"
                strokeDasharray={`${Math.min(100, score)}`}
                strokeDashoffset="0"
                className="drop-shadow-md"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-poppins text-slate-800">{Math.round(score)}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Financial Fitness</p>
            <h2 className="text-lg font-semibold mt-1 text-slate-800">
              {score >= 80 ? 'Excellent! 🎉' : score >= 50 ? 'Good progress!' : 'Keep going! 💪'}
            </h2>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">🌱 {level}</Badge>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">🔥 {streak}-day streak</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {score >= 50 ? 'You\'re on the right track!' : 'Complete a challenge to start.'}
            </p>
          </div>
        </Card>

        {/* PROACTIVE NUDGE */}
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50 p-6 bg-gradient-to-br from-white to-orange-50/30 hover:shadow-xl transition-shadow duration-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">⚡ Proactive Nudge</p>
          <h3 className="font-semibold mt-1 text-slate-800">
            {profile?.goal === 'emergency_fund' && 'Build your ₹10,000 emergency fund'}
            {profile?.goal === 'children_education' && 'Save for your child\'s education'}
            {!profile?.goal && 'Set a goal to save ₹500 this month'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            You've saved ₹{savedAmount} so far. 
            {savedAmount < targetAmount && ' A small top-up keeps you on track.'}
            {savedAmount >= targetAmount && ' 🎉 Goal achieved! Set a new one.'}
          </p>
          <Progress value={progressPercent} className="h-2 mt-3" />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-500">₹{savedAmount} of ₹{targetAmount} saved</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-orange-500 text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all"
              onClick={() => navigate('/chat', { state: { initialMessage: 'I want to update my savings goal' } })}
            >
              Check in now
            </Button>
          </div>
        </Card>

        {/* INSIGHTS */}
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50 p-6 col-span-1 md:col-span-2 bg-gradient-to-br from-white to-orange-50/30 hover:shadow-xl transition-shadow duration-300">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">📈 Insights</p>
              <h3 className="font-semibold text-slate-800">Spending vs. Savings — Last 4 Weeks</h3>
            </div>
            <span className={`text-sm font-semibold ${trendColor}`}>{trendText}</span>
          </div>
          <div className="flex items-end gap-4 h-24">
            {weekData.map((week, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="flex gap-1.5 items-end h-20">
                  <div className="w-4 bg-purple-200 rounded-t hover:bg-purple-300 transition-colors" style={{ height: `${week.spend}%` }} />
                  <div className="w-4 bg-orange-500 rounded-t hover:bg-orange-600 transition-colors" style={{ height: `${week.save}%` }} />
                </div>
                <span className="text-xs text-slate-500 mt-1">Wk {i + 1}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span><span className="inline-block w-3 h-3 bg-purple-200 rounded mr-1.5" /> Spending</span>
            <span><span className="inline-block w-3 h-3 bg-orange-500 rounded mr-1.5" /> Savings</span>
          </div>
        </Card>

        {/* SCHEME CARD */}
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50 p-4 flex items-start gap-3 cursor-pointer bg-gradient-to-br from-white to-orange-50/30 hover:shadow-xl hover:scale-[1.02] transition-all duration-300" onClick={() => navigate('/chat', { state: { initialMessage: 'Show me relevant government schemes for me' } })}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-xl shrink-0">💡</div>
          <div>
            <h4 className="font-medium text-sm text-slate-800">
              {profile?.occupation === 'farmer' && 'PM-KISAN — ₹6,000/year for farmers'}
              {profile?.occupation === 'gig_worker' && 'PM SVANidhi — loans for street vendors'}
              {profile?.occupation === 'homemaker' && 'PM Ujjwala — free LPG connection'}
              {!profile?.occupation && 'Check eligibility for government schemes'}
            </h4>
            <span className="text-orange-600 text-sm font-medium mt-1 inline-block">Check now →</span>
          </div>
        </Card>

        {/* CHALLENGE CARD */}
        <Card className="border-orange-200 shadow-lg shadow-orange-100/50 p-4 bg-gradient-to-br from-white to-orange-50/30 hover:shadow-xl transition-shadow duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Financial Fitness</p>
              <h4 className="font-semibold text-slate-800">Today's Challenge</h4>
            </div>
            <div className="text-right">
              <span className="text-orange-600 font-bold text-sm">{streak} 🔥</span>
              <Badge variant="outline" className="block text-xs mt-1 border-orange-200 text-orange-700">{level}</Badge>
            </div>
          </div>
          <Progress value={Math.min(100, (score / 100) * 100)} className="h-1.5 mt-3" />
          <Button 
            className="w-full mt-3 bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 border border-green-200 hover:shadow-md transition-all"
            onClick={() => navigate('/fitness')}
          >
            ⚡ Take Challenge
          </Button>
        </Card>

      </div>

      {/* FAB — always opens Voice Orb for voice-first experience */}
      <Button 
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-2xl shadow-xl shadow-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300"
        onClick={() => navigate('/orb')}
      >
        🎤
      </Button>
    </AppLayout>
  );
}