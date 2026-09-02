import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Loader2, Plus, Save, Trash2, User2, TrendingUp } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getProfile, saveProfile } from '@/lib/api';
import { useUserProfile } from '@/context/UserProfileContext';
import { useToast } from '@/context/ToastContext';

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'aggressive', label: 'Aggressive' },
];

export default function ProfilePage() {
  const { user } = useUser();
  const { profile, updateProfile } = useUserProfile();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    monthly_income: '',
    monthly_expenses: '',
    savings_goal_amount: '',
    risk_profile: 'conservative',
    goals: [],
    loans: [],
    sips: [],
    notes: '',
  });
  const [goalText, setGoalText] = useState('');

  const firstName = user?.firstName || 'User';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = await getProfile(user.id);
        if (cancelled) return;
        setForm({
          monthly_income: doc.monthly_income ?? '',
          monthly_expenses: doc.monthly_expenses ?? '',
          savings_goal_amount: doc.savings_goal_amount ?? '',
          risk_profile: doc.risk_profile || 'conservative',
          goals: Array.isArray(doc.goals) ? doc.goals : [],
          loans: Array.isArray(doc.loans) ? doc.loans : [],
          sips: Array.isArray(doc.sips) ? doc.sips : [],
          notes: doc.notes || '',
        });
      } catch {
        if (cancelled) return;
        setForm((f) => ({ ...f, risk_profile: profile?.riskProfile || 'conservative' }));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addGoal() {
    const value = goalText.trim();
    if (!value || form.goals.includes(value)) return;
    set('goals', [...form.goals, value]);
    setGoalText('');
  }

  function removeGoal(goal) {
    set('goals', form.goals.filter((g) => g !== goal));
  }

  function addLoan() {
    set('loans', [...form.loans, { type: 'personal', lender: '', emi: '', outstanding: '' }]);
  }

  function updateLoan(index, key, value) {
    const loans = form.loans.map((loan, i) => (i === index ? { ...loan, [key]: value } : loan));
    set('loans', loans);
  }

  function removeLoan(index) {
    set('loans', form.loans.filter((_, i) => i !== index));
  }

  async function save() {
    setSaving(true);
    try {
      const loans = form.loans.map((l) => ({
        type: l.type || 'personal',
        lender: l.lender || '',
        emi: l.emi ? Number(l.emi) : null,
        outstanding: l.outstanding ? Number(l.outstanding) : null,
      }));
      const payload = {
        user_id: user.id,
        language: profile?.language || 'english',
        occupation: profile?.occupation || 'other',
        money_comfort: profile?.moneyComfort || profile?.money_comfort || 'beginner',
        goal: profile?.goal || 'emergency_fund',
        onboarding_complete: true,
        goals: form.goals,
        savings_goal_amount: form.savings_goal_amount ? Number(form.savings_goal_amount) : null,
        monthly_income: form.monthly_income ? Number(form.monthly_income) : null,
        monthly_expenses: form.monthly_expenses ? Number(form.monthly_expenses) : null,
        risk_profile: form.risk_profile,
        loans,
        notes: form.notes,
      };
      await saveProfile(payload);
      updateProfile({ riskProfile: form.risk_profile, goals: form.goals });
      addToast('Profile saved', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading profile…
        </div>
      </AppLayout>
    );
  }

  const num = (v) => (v === '' || v == null ? null : Number(v));
  const income = num(form.monthly_income);
  const expenses = num(form.monthly_expenses);
  const goalAmount = num(form.savings_goal_amount);
  const disposable = income !== null && expenses !== null ? Math.max(0, income - expenses) : null;

  const tiles = [
    { label: 'Monthly income', value: income != null ? `₹${income.toLocaleString('en-IN')}` : '—', icon: '💰' },
    { label: 'Monthly expenses', value: expenses != null ? `₹${expenses.toLocaleString('en-IN')}` : '—', icon: '🧾' },
    { label: 'Savings goal', value: goalAmount != null ? `₹${goalAmount.toLocaleString('en-IN')}` : '—', icon: '🎯' },
    { label: 'Disposable', value: disposable != null ? `₹${disposable.toLocaleString('en-IN')}` : '—', icon: '📈' },
  ];

  return (
    <AppLayout>
      <div className="mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-orange-200/60">
          {firstName[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{user?.fullName || firstName}</h1>
          <p className="text-sm text-slate-500">Your financial profile and goals</p>
        </div>
        <Badge variant="secondary" className="ml-auto bg-orange-50 text-orange-700 border-orange-200">
          {profile?.fitnessLevel || 'Beginner'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {tiles.map((tile) => (
          <Card key={tile.label} className="border-orange-200 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{tile.icon} {tile.label}</p>
              <p className="mt-1.5 text-xl font-bold text-slate-800">{tile.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-orange-200 shadow-lg shadow-orange-100/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800"><User2 className="mr-2 inline h-5 w-5 text-orange-600" />Edit profile</h2>
              <p className="text-sm text-slate-500 mt-1">Your answers help DhanMitra tailor advice and nudges.</p>
            </div>
            <Button onClick={save} disabled={saving} className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200/60">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="income">Monthly income (₹)</Label>
              <Input id="income" type="number" min="0" placeholder="e.g. 25000" value={form.monthly_income} onChange={(e) => set('monthly_income', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenses">Monthly expenses (₹)</Label>
              <Input id="expenses" type="number" min="0" placeholder="e.g. 15000" value={form.monthly_expenses} onChange={(e) => set('monthly_expenses', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goalamt">Savings goal amount (₹)</Label>
              <Input id="goalamt" type="number" min="0" placeholder="e.g. 50000" value={form.savings_goal_amount} onChange={(e) => set('savings_goal_amount', e.target.value)} />
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="risk">Risk profile</Label>
              <select
                id="risk"
                value={form.risk_profile}
                onChange={(e) => set('risk_profile', e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                {RISK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Savings goals</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. New house, Trip, Retirement" value={goalText} onChange={(e) => setGoalText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }} />
                <Button type="button" variant="outline" className="shrink-0 border-orange-200 text-orange-600 hover:bg-orange-50" onClick={addGoal}><Plus className="h-4 w-4" /></Button>
              </div>
              {form.goals.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.goals.map((g) => (
                    <Badge key={g} variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                      🎯 {g}
                      <button type="button" onClick={() => removeGoal(g)} className="ml-1.5 text-orange-400 hover:text-orange-700">×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Loans */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="mb-0">Loans / EMIs</Label>
              <Button type="button" variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50" onClick={addLoan}><Plus className="mr-1 h-3.5 w-3.5" />Add loan</Button>
            </div>
            {form.loans.length === 0 && <p className="text-sm text-slate-400">No loans added.</p>}
            <div className="space-y-3">
              {form.loans.map((loan, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[130px_1fr_110px_130px_36px] rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <select value={loan.type} onChange={(e) => updateLoan(i, 'type', e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-orange-400">
                    {['personal', 'home', 'education', 'vehicle', 'credit_card', 'other'].map((t) => (
                      <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                    ))}
                  </select>
                  <Input placeholder="Lender" value={loan.lender || ''} onChange={(e) => updateLoan(i, 'lender', e.target.value)} />
                  <Input type="number" placeholder="EMI ₹/mo" value={loan.emi ?? ''} onChange={(e) => updateLoan(i, 'emi', e.target.value)} />
                  <Input type="number" placeholder="Outstanding ₹" value={loan.outstanding ?? ''} onChange={(e) => updateLoan(i, 'outstanding', e.target.value)} />
                  <button type="button" onClick={() => removeLoan(i)} className="flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* SIPs / Auto-investments (from chat) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="mb-0"><TrendingUp className="mr-1.5 inline h-4 w-4 text-orange-600" />My SIPs / investments</Label>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">{form.sips.length} active</Badge>
            </div>
            {form.sips.length === 0 ? (
              <p className="text-sm text-slate-400">No SIPs yet. Ask DhanMitra in chat to start one — e.g. "start a SIP of ₹1000 monthly".</p>
            ) : (
              <div className="space-y-2">
                {form.sips.map((sip, i) => {
                  const freqLabel = (sip.frequency || 'monthly');
                  return (
                    <div key={sip.plan_id || i} className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 capitalize">{sip.purpose || 'Investment'}</p>
                        <p className="text-xs text-slate-500 capitalize">Every {freqLabel} · started {sip.created_at ? new Date(sip.created_at).toLocaleDateString('en-IN') : 'recently'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">₹{Number(sip.amount || 0).toLocaleString('en-IN')}</p>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">{sip.status || 'active'}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Anything else that helps DhanMitra help you…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => navigate('/home')}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}