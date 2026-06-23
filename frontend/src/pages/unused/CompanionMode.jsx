// import { useState, useEffect } from 'react'
// import { Plus, Target, TrendingUp, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import { Progress } from '@/components/ui/progress'
// import { Badge } from '@/components/ui/badge'
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
// import { useUserProfile } from '@/context/UserProfileContext'
// import { useUser } from '@clerk/clerk-react'

// const INCOME_TYPES = [
//   { value: 'daily', label: 'Daily wages' },
//   { value: 'weekly', label: 'Weekly' },
//   { value: 'irregular', label: 'Irregular / project-based' },
//   { value: 'monthly', label: 'Monthly salary' },
//   { value: 'seasonal', label: 'Seasonal (farming etc.)' },
// ]

// function useCompanionData(userId) {
//   const key = `dhanmitra_companion_${userId}`

//   const load = () => {
//     try {
//       const stored = localStorage.getItem(key)
//       return stored
//         ? JSON.parse(stored)
//         : { incomes: [], expenses: [], goals: [] }
//     } catch { return { incomes: [], expenses: [], goals: [] } }
//   }

//   const [data, setData] = useState(load)

//   const save = (next) => {
//     setData(next)
//     localStorage.setItem(key, JSON.stringify(next))
//   }

//   return { data, save }
// }

// export default function CompanionMode() {
//   const { profile } = useUserProfile()
//   const { user } = useUser()
//   const { data, save } = useCompanionData(user?.id || 'guest')

//   // Income dialog
//   const [incomeOpen, setIncomeOpen] = useState(false)
//   const [incomeForm, setIncomeForm] = useState({ amount: '', type: 'daily', note: '' })

//   // Expense dialog
//   const [expenseOpen, setExpenseOpen] = useState(false)
//   const [expenseForm, setExpenseForm] = useState({ amount: '', category: '', note: '' })

//   // Goal dialog
//   const [goalOpen, setGoalOpen] = useState(false)
//   const [goalForm, setGoalForm] = useState({ name: '', target: '', saved: '' })

//   const totalIncome = data.incomes.reduce((s, i) => s + Number(i.amount), 0)
//   const totalExpenses = data.expenses.reduce((s, e) => s + Number(e.amount), 0)
//   const balance = totalIncome - totalExpenses
//   const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0

//   const addIncome = () => {
//     if (!incomeForm.amount) return
//     save({
//       ...data,
//       incomes: [
//         ...data.incomes,
//         { id: crypto.randomUUID(), ...incomeForm, date: new Date().toISOString() },
//       ],
//     })
//     setIncomeForm({ amount: '', type: 'daily', note: '' })
//     setIncomeOpen(false)
//   }

//   const addExpense = () => {
//     if (!expenseForm.amount) return
//     save({
//       ...data,
//       expenses: [
//         ...data.expenses,
//         { id: crypto.randomUUID(), ...expenseForm, date: new Date().toISOString() },
//       ],
//     })
//     setExpenseForm({ amount: '', category: '', note: '' })
//     setExpenseOpen(false)
//   }

//   const addGoal = () => {
//     if (!goalForm.name || !goalForm.target) return
//     save({
//       ...data,
//       goals: [
//         ...data.goals,
//         { id: crypto.randomUUID(), ...goalForm, saved: Number(goalForm.saved) || 0, date: new Date().toISOString() },
//       ],
//     })
//     setGoalForm({ name: '', target: '', saved: '' })
//     setGoalOpen(false)
//   }

//   const deleteItem = (collection, id) => {
//     save({ ...data, [collection]: data[collection].filter((item) => item.id !== id) })
//   }

//   const updateGoalSaved = (id, amount) => {
//     save({
//       ...data,
//       goals: data.goals.map((g) =>
//         g.id === id ? { ...g, saved: Math.min(Number(g.target), Number(g.saved) + Number(amount)) } : g
//       ),
//     })
//   }

//   return (
//     <div className="h-full overflow-y-auto px-4 py-4 space-y-4 max-w-3xl mx-auto">
//       {/* Summary strip */}
//       <div className="grid grid-cols-3 gap-3">
//         <Card className="bg-green-50 border-green-200">
//           <CardContent className="pt-4 pb-3">
//             <p className="text-xs text-green-700 font-medium mb-0.5">Total Income</p>
//             <p className="text-xl font-bold text-green-800">₹{totalIncome.toLocaleString('en-IN')}</p>
//           </CardContent>
//         </Card>
//         <Card className="bg-red-50 border-red-200">
//           <CardContent className="pt-4 pb-3">
//             <p className="text-xs text-red-700 font-medium mb-0.5">Total Expenses</p>
//             <p className="text-xl font-bold text-red-800">₹{totalExpenses.toLocaleString('en-IN')}</p>
//           </CardContent>
//         </Card>
//         <Card className={balance >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}>
//           <CardContent className="pt-4 pb-3">
//             <p className={`text-xs font-medium mb-0.5 ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Balance</p>
//             <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
//               ₹{balance.toLocaleString('en-IN')}
//             </p>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Savings rate */}
//       {totalIncome > 0 && (
//         <Card>
//           <CardContent className="pt-4 pb-3 space-y-2">
//             <div className="flex justify-between items-center">
//               <span className="text-sm font-medium flex items-center gap-1.5">
//                 <TrendingUp className="h-4 w-4 text-blue-500" />
//                 Savings Rate
//               </span>
//               <span className={`text-sm font-bold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-orange-500' : 'text-red-500'}`}>
//                 {savingsRate}%
//               </span>
//             </div>
//             <Progress value={Math.max(0, savingsRate)} className="h-2" />
//             <p className="text-xs text-muted-foreground">
//               {savingsRate >= 20
//                 ? '✅ Great savings discipline!'
//                 : savingsRate >= 10
//                 ? '⚠️ Try to save at least 20% of income'
//                 : '🚨 Expenses are eating most of your income'}
//             </p>
//           </CardContent>
//         </Card>
//       )}

//       {/* Income section */}
//       <Card>
//         <CardHeader className="pb-2">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-base">Income</CardTitle>
//             <Button size="sm" variant="outline" onClick={() => setIncomeOpen(true)} className="gap-1">
//               <Plus className="h-3.5 w-3.5" /> Add
//             </Button>
//           </div>
//           <CardDescription>Track every earning — daily wages, transfers, anything</CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-2">
//           {data.incomes.length === 0 && (
//             <p className="text-sm text-muted-foreground text-center py-4">No income recorded yet</p>
//           )}
//           {data.incomes.slice().reverse().map((item) => (
//             <div key={item.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
//               <div>
//                 <span className="text-sm font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
//                 <span className="text-xs text-muted-foreground ml-2">{item.note || item.type}</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Badge variant="secondary" className="text-xs">{item.type}</Badge>
//                 <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteItem('incomes', item.id)}>
//                   <Trash2 className="h-3 w-3 text-red-400" />
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </CardContent>
//       </Card>

//       {/* Expenses section */}
//       <Card>
//         <CardHeader className="pb-2">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-base">Expenses</CardTitle>
//             <Button size="sm" variant="outline" onClick={() => setExpenseOpen(true)} className="gap-1">
//               <Plus className="h-3.5 w-3.5" /> Add
//             </Button>
//           </div>
//           <CardDescription>Log spending to understand where money goes</CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-2">
//           {data.expenses.length === 0 && (
//             <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded yet</p>
//           )}
//           {data.expenses.slice().reverse().map((item) => (
//             <div key={item.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
//               <div>
//                 <span className="text-sm font-medium">₹{Number(item.amount).toLocaleString('en-IN')}</span>
//                 <span className="text-xs text-muted-foreground ml-2">{item.note || item.category}</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
//                 <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteItem('expenses', item.id)}>
//                   <Trash2 className="h-3 w-3 text-red-400" />
//                 </Button>
//               </div>
//             </div>
//           ))}
//         </CardContent>
//       </Card>

//       {/* Goals section */}
//       <Card>
//         <CardHeader className="pb-2">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-base flex items-center gap-1.5">
//               <Target className="h-4 w-4 text-orange-500" /> Goals
//             </CardTitle>
//             <Button size="sm" variant="outline" onClick={() => setGoalOpen(true)} className="gap-1">
//               <Plus className="h-3.5 w-3.5" /> Add
//             </Button>
//           </div>
//           <CardDescription>Track what you're saving toward</CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {data.goals.length === 0 && (
//             <p className="text-sm text-muted-foreground text-center py-4">No goals yet — add one!</p>
//           )}
//           {data.goals.map((goal) => {
//             const pct = Math.min(100, Math.round((Number(goal.saved) / Number(goal.target)) * 100))
//             const done = pct >= 100
//             return (
//               <div key={goal.id} className="space-y-2">
//                 <div className="flex items-center justify-between">
//                   <span className="text-sm font-medium flex items-center gap-1.5">
//                     {done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Target className="h-3.5 w-3.5 text-orange-400" />}
//                     {goal.name}
//                   </span>
//                   <div className="flex items-center gap-2">
//                     <span className="text-xs text-muted-foreground">
//                       ₹{Number(goal.saved).toLocaleString('en-IN')} / ₹{Number(goal.target).toLocaleString('en-IN')}
//                     </span>
//                     <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteItem('goals', goal.id)}>
//                       <Trash2 className="h-3 w-3 text-red-400" />
//                     </Button>
//                   </div>
//                 </div>
//                 <Progress value={pct} className="h-2" />
//                 {!done && (
//                   <AddToGoalInline goalId={goal.id} onAdd={updateGoalSaved} />
//                 )}
//               </div>
//             )
//           })}
//         </CardContent>
//       </Card>

//       {/* Income dialog */}
//       <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Add Income</DialogTitle>
//             <DialogDescription>Record any earning — wages, transfers, or anything else</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-3 pt-2">
//             <div className="space-y-1">
//               <Label>Amount (₹)</Label>
//               <Input
//                 type="number"
//                 placeholder="e.g. 500"
//                 value={incomeForm.amount}
//                 onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Income type</Label>
//               <Select value={incomeForm.type} onValueChange={(v) => setIncomeForm({ ...incomeForm, type: v })}>
//                 <SelectTrigger><SelectValue /></SelectTrigger>
//                 <SelectContent>
//                   {INCOME_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-1">
//               <Label>Note (optional)</Label>
//               <Input
//                 placeholder="e.g. Swiggy delivery Tuesday"
//                 value={incomeForm.note}
//                 onChange={(e) => setIncomeForm({ ...incomeForm, note: e.target.value })}
//               />
//             </div>
//             <Button className="w-full" onClick={addIncome} disabled={!incomeForm.amount}>Save Income</Button>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Expense dialog */}
//       <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Add Expense</DialogTitle>
//             <DialogDescription>Track where your money is going</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-3 pt-2">
//             <div className="space-y-1">
//               <Label>Amount (₹)</Label>
//               <Input
//                 type="number"
//                 placeholder="e.g. 200"
//                 value={expenseForm.amount}
//                 onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Category</Label>
//               <Select value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
//                 <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
//                 <SelectContent>
//                   {['Food', 'Transport', 'Rent', 'Medical', 'Education', 'Mobile/Internet', 'Fuel', 'Other'].map((c) => (
//                     <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//             <div className="space-y-1">
//               <Label>Note (optional)</Label>
//               <Input
//                 placeholder="e.g. Auto to work"
//                 value={expenseForm.note}
//                 onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
//               />
//             </div>
//             <Button className="w-full" onClick={addExpense} disabled={!expenseForm.amount}>Save Expense</Button>
//           </div>
//         </DialogContent>
//       </Dialog>

//       {/* Goal dialog */}
//       <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Add Goal</DialogTitle>
//             <DialogDescription>Set a savings target to work toward</DialogDescription>
//           </DialogHeader>
//           <div className="space-y-3 pt-2">
//             <div className="space-y-1">
//               <Label>Goal name</Label>
//               <Input
//                 placeholder="e.g. Emergency fund, New phone"
//                 value={goalForm.name}
//                 onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Target amount (₹)</Label>
//               <Input
//                 type="number"
//                 placeholder="e.g. 10000"
//                 value={goalForm.target}
//                 onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Already saved (₹) — optional</Label>
//               <Input
//                 type="number"
//                 placeholder="e.g. 2000"
//                 value={goalForm.saved}
//                 onChange={(e) => setGoalForm({ ...goalForm, saved: e.target.value })}
//               />
//             </div>
//             <Button className="w-full" onClick={addGoal} disabled={!goalForm.name || !goalForm.target}>Create Goal</Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }

// function AddToGoalInline({ goalId, onAdd }) {
//   const [val, setVal] = useState('')
//   return (
//     <div className="flex gap-2">
//       <Input
//         type="number"
//         placeholder="Add ₹ to this goal"
//         className="h-7 text-xs"
//         value={val}
//         onChange={(e) => setVal(e.target.value)}
//       />
//       <Button
//         size="sm"
//         className="h-7 text-xs"
//         onClick={() => { if (val) { onAdd(goalId, val); setVal('') } }}
//         disabled={!val}
//       >
//         Add
//       </Button>
//     </div>
//   )
// }   