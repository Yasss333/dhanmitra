import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { sendChatMessage } from '@/lib/api';
import { Trophy, Zap, CheckCircle2, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function FinancialFitnessHub() {
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(profile.fitnessScore || 0);
  const [streak, setStreak] = useState(profile.fitnessStreak || 0);
  const [level, setLevel] = useState(profile.fitnessLevel || 'Beginner');
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const fetchChallenge = async () => {
    setLoading(true);
    setSelected(null);
    setAnswered(false);
    try {
      const data = await sendChatMessage({
        message: "Give me a financial fitness challenge based on my profile. Return ONLY JSON.",
        mode: 'sahayak',
        session_id: `fitness-${user?.id}-${Date.now()}`,
        user_id: user?.id || 'anonymous',
        profile,
      });

      // Parse the JSON from the LLM response
      let parsed;
      try {
        // Clean potential markdown fences
        let clean = data.reply.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch (e) {
        // Fallback: If LLM fails, use a default static question
        parsed = {
          scenario: "You earn ₹4,200/week. Rent ₹3,000, essentials ₹800. What do you do with ₹400 left?",
          options: ["Spend it", "Put it in savings", "Borrow more", "Don't track it"],
          correctIndex: 1,
          explanation: "Saving small amounts consistently builds an emergency buffer."
        };
      }
      setChallenge(parsed);
    } catch (error) {
      console.error("Challenge fetch error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const handleAnswer = (index) => {
    if (answered) return;
    setSelected(index);
    setAnswered(true);

    const isCorrect = index === challenge.correctIndex;
    const newScore = isCorrect ? score + 10 : score;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newLevel = newScore >= 200 ? 'Champion' : newScore >= 100 ? 'Aware' : 'Beginner';

    setScore(newScore);
    setStreak(newStreak);
    setLevel(newLevel);

    // Update the backend profile
    updateProfile({
      fitnessScore: newScore,
      fitnessStreak: newStreak,
      fitnessLevel: newLevel,
    });

    // Send update to MongoDB via profile endpoint
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id,
        fitnessScore: newScore,
        fitnessStreak: newStreak,
        fitnessLevel: newLevel,
      }),
    }).catch(err => console.error("Profile update failed:", err));
  };

  const handleNext = () => {
    if (finished) {
      setFinished(false);
      setChallenge(null);
      fetchChallenge();
    } else {
      fetchChallenge();
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex items-center justify-center"
      >
        <div className="text-slate-400 text-sm flex items-center gap-2">
          <motion.span 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >⟳</motion.span> Generating your challenge...
        </div>
      </motion.div>
    );
  }

  if (!challenge) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-full flex items-center justify-center"
      >
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8">
            <p className="text-muted-foreground">No challenge available.</p>
            <Button onClick={fetchChallenge} className="mt-4">Retry</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const progress = Math.min(100, (score / 200) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto px-4 py-4 max-w-2xl mx-auto space-y-4"
    >
      {/* Header with Back Button for Accessibility */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate('/home')}
          className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-white border border-slate-700/50 transition-all flex items-center gap-2 text-sm hover:shadow-lg"
          aria-label="Go back to Home"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Badge variant="outline" className="text-xs">
          {level} • {score} pts
        </Badge>
      </motion.div>

      {/* Streak & Level Indicator */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-4 bg-slate-800/40 rounded-xl p-3 border border-slate-700"
      >
        <Trophy className="h-5 w-5 text-orange-400" />
        <span className="text-white font-medium text-sm">Level: {level}</span>
        <span className="text-slate-400 text-sm">|</span>
        <span className="text-white font-medium text-sm">🔥 {streak} day streak</span>
        <div className="flex-1" />
        <span className="text-slate-400 text-xs">{score}/200 pts</span>
      </motion.div>

      <Progress value={progress} className="h-1.5" />

      {/* The Challenge Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-relaxed">{challenge.scenario}</CardTitle>
            <CardDescription>What would you do?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {challenge.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const isCorrect = idx === challenge.correctIndex;
              let borderClass = 'border-slate-200 hover:border-orange-300 cursor-pointer';
              if (isSelected && isCorrect) borderClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
              if (isSelected && !isCorrect) borderClass = 'border-red-400 bg-red-50 dark:bg-red-900/20';
              if (answered && !isSelected && isCorrect) borderClass = 'border-green-400 bg-green-50/50 dark:bg-green-900/10';

              return (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + (idx * 0.1) }}
                  onClick={() => handleAnswer(idx)}
                  className={`border rounded-lg p-3 transition-colors ${borderClass}`}
                >
                  <div className="flex items-start gap-2">
                    {answered && isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />}
                    {isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                    <span className="text-sm font-medium">{String.fromCharCode(65 + idx)}) {opt}</span>
                  </div>
                  {isSelected && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-muted-foreground mt-2 pl-6 leading-relaxed"
                    >
                      {isCorrect ? '✅ Correct!' : '❌ Incorrect.'} {challenge.explanation}
                    </motion.p>
                  )}
                  {answered && !isSelected && isCorrect && (
                    <motion.p 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-xs text-green-700 dark:text-green-400 mt-2 pl-6 leading-relaxed"
                    >
                      💡 {challenge.explanation}
                    </motion.p>
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>

      {answered && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Button className="w-full" onClick={handleNext}>
            {finished ? 'Restart Challenge' : 'Next Challenge →'}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}