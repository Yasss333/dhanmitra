import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck, Sparkles, TestTube2, CreditCard } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addSandboxCredit, createPayment, createRazorpayOrder, verifyRazorpayPayment } from '@/lib/api';

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const GATEWAYS = [
  { id: 'razorpay', label: 'Razorpay', icon: CreditCard, tag: 'TEST CHECKOUT' },
  { id: 'setu', label: 'Setu UPI', icon: TestTube2, tag: 'SANDBOX' },
];

export default function UPISandboxPage() {
  const { user } = useUser();
  const [gateway, setGateway] = useState('razorpay');
  const [amount, setAmount] = useState('100');
  const [purpose, setPurpose] = useState('DhanMitra savings top-up');
  const [payment, setPayment] = useState(null);
  const [payerVpa, setPayerVpa] = useState('sandbox.customer@upi');
  const [razorpayResult, setRazorpayResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function createLink(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice(''); setRazorpayResult(null);
    try {
      const result = await createPayment({ amount: Number(amount), purpose, session_id: `upi-${Date.now()}`, user_id: user?.id || 'sandbox-user' });
      setPayment(result.data);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function payWithRazorpay(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice(''); setRazorpayResult(null); setPayment(null);
    try {
      const amountPaise = Math.round(Number(amount) * 100);
      if (amountPaise < 100) throw new Error('Amount must be at least ₹1.');
      const order = await createRazorpayOrder({ amount: amountPaise, purpose, session_id: `rzp-${Date.now()}`, user_id: user?.id || 'sandbox-user' });
      await openCheckout(order, purpose);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function openCheckout(order, purpose) {
    return new Promise((resolve, reject) => {
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) return reject(new Error('VITE_RAZORPAY_KEY_ID is missing in frontend/.env'));
      if (typeof window.Razorpay === 'undefined') return reject(new Error('Razorpay checkout script failed to load. Check your internet connection.'));

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: 'DhanMitra',
        description: purpose,
        order_id: order.order_id,
        theme: { color: '#13795b' },
        prefill: {
          name: user?.fullName || 'DhanMitra User',
          email: user?.primaryEmailAddress?.emailAddress || '',
          contact: user?.primaryPhoneNumber?.phoneNumber || '',
        },
        handler: async (response) => {
          try {
            const verified = await verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              session_id: `rzp-${Date.now()}`,
              user_id: user?.id || 'sandbox-user',
            });
            setRazorpayResult(verified);
            resolve(verified);
          } catch (err) { reject(err); }
        },
        modal: { ondismiss: () => { setNotice('Payment window closed. No money was moved.'); resolve(null); } },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        reject(new Error(`Payment failed: ${response.error?.description || 'unknown reason'}`));
      });
      rzp.open();
    });
  }

  async function simulatePayment() {
    setBusy(true); setError(''); setNotice('');
    try {
      await addSandboxCredit({ transaction_id: payment.transaction_id, amount: payment.amount, upi_id: payment.upi_id, payer_vpa: payerVpa });
      setNotice('Mock payment sent. The webhook will update the final status shortly.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
    setNotice('Copied to clipboard.');
  }

  const active = GATEWAYS.find((g) => g.id === gateway);

  return <AppLayout>
    <section className="mb-8 overflow-hidden rounded-3xl bg-[#172b24] px-6 py-7 text-white shadow-xl shadow-emerald-950/15 md:px-9">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-100"><active.icon className="h-3.5 w-3.5" /> {active.label.toUpperCase()} · {active.tag}</div>
          <h1 className="text-3xl font-bold tracking-tight">Try a UPI payment safely.</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-100/80">Open a real test-mode checkout (Razorpay) or simulate a Setu payment link without moving real money.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-100"><ShieldCheck className="h-5 w-5 text-emerald-300" /> No live payments in this environment</div>
      </div>
    </section>

    <div className="mb-6 inline-flex rounded-xl border border-[#eadfc9] bg-white/70 p-1 text-sm font-semibold">
      {GATEWAYS.map((g) => (
        <button key={g.id} type="button" onClick={() => { setGateway(g.id); setError(''); setNotice(''); setRazorpayResult(null); setPayment(null); }}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 transition ${gateway === g.id ? 'bg-[#172b24] text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}>
          <g.icon className="h-4 w-4" /> {g.label}
        </button>
      ))}
    </div>

    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <Card className="border-[#eadfc9] bg-white/90 shadow-sm"><CardContent className="p-6">
        <div className="mb-6"><p className="text-sm font-semibold text-emerald-700">01 · Create a test checkout</p><h2 className="mt-1 text-xl font-bold text-slate-900">What are you collecting?</h2></div>
        <form className="space-y-5" onSubmit={gateway === 'razorpay' ? payWithRazorpay : createLink}>
          <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="amount">Amount</Label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-500">₹</span><Input id="amount" className="pl-7" type="number" min="1" max="100000" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div></div><div className="space-y-2"><Label htmlFor="purpose">Payment note</Label><Input id="purpose" maxLength="80" value={purpose} onChange={(e) => setPurpose(e.target.value)} required /></div></div>
          {gateway === 'razorpay' ? (
            <Button disabled={busy} type="submit" className="w-full bg-[#e86621] hover:bg-[#cb5315]">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Pay with Razorpay</Button>
          ) : (
            <Button disabled={busy} type="submit" className="w-full bg-[#e86621] hover:bg-[#cb5315]">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Create Setu test link</Button>
          )}
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}
      </CardContent></Card>

      <Card className="border-[#eadfc9] bg-[#fffdf8] shadow-sm"><CardContent className="p-6">
        {gateway === 'razorpay' && razorpayResult && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100"><CheckCircle2 className="h-8 w-8 text-emerald-700" /></div>
            <h2 className="text-xl font-bold text-slate-900">Payment verified</h2>
            <p className="mt-1 text-sm text-slate-500">Signature matched server-side. Funds are marked as received.</p>
            <div className="mt-5 space-y-2 rounded-2xl border border-[#ebe3d3] bg-white p-4 text-left text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Amount</span><span className="font-semibold text-slate-800">{money.format(Number(amount))}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-slate-500">Payment ID</span><span className="max-w-[60%] truncate font-mono text-xs text-slate-700">{razorpayResult.razorpay_payment_id}</span></div>
            </div>
          </div>
        )}

        {gateway === 'razorpay' && !razorpayResult && (
          <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-orange-100 p-4 text-2xl">₹</div><h2 className="font-bold text-slate-800">Your Razorpay checkout will appear here</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">A popup opens where you can pay with UPI test IDs like success@razorpay or failure@razorpay.</p></div>
        )}

        {gateway === 'setu' && !payment && (
          <div className="flex min-h-64 flex-col items-center justify-center text-center"><div className="mb-4 rounded-2xl bg-orange-100 p-4 text-2xl">₹</div><h2 className="font-bold text-slate-800">Your test payment will appear here</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Setu returns a unique link and UPI ID for every payment request.</p></div>
        )}

        {gateway === 'setu' && payment && (
          <div>
            <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-emerald-700">02 · Test payment ready</p><h2 className="mt-1 text-3xl font-bold text-slate-900">{money.format(payment.amount)}</h2><p className="mt-1 text-sm text-slate-500">{payment.purpose}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">CREATED</span></div>
            <div className="mt-6 space-y-3 rounded-2xl border border-[#ebe3d3] bg-white p-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-slate-500">UPI ID</span><button onClick={() => copy(payment.upi_id)} className="inline-flex max-w-[70%] items-center gap-1 truncate font-medium text-slate-800 hover:text-orange-600">{payment.upi_id}<Copy className="h-3.5 w-3.5 shrink-0" /></button></div><div className="flex items-center justify-between gap-3"><span className="text-slate-500">Reference</span><span className="max-w-[70%] truncate font-mono text-xs text-slate-700">{payment.transaction_id}</span></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2"><Button asChild variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50"><a href={payment.payment_link || payment.upi_deeplink} target="_blank" rel="noreferrer">Open payment link <ExternalLink className="ml-2 h-4 w-4" /></a></Button><Button onClick={simulatePayment} disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}Mock payment</Button></div>
            <div className="mt-5 border-t border-[#eee6d7] pt-4"><Label htmlFor="payer" className="text-xs text-slate-500">Sandbox payer VPA</Label><Input id="payer" className="mt-2" value={payerVpa} onChange={(e) => setPayerVpa(e.target.value)} /></div>
          </div>
        )}
      </CardContent></Card>
    </div>
    <div className="mt-6 grid gap-3 md:grid-cols-3">{[['1', 'Create order', gateway === 'razorpay' ? 'A secure order is created server-side with your test keys.' : 'A secure Setu link is generated server-side.'], ['2', 'Pay or mock', gateway === 'razorpay' ? 'Use success@razorpay or failure@razorpay in the popup.' : 'Use a UPI app, or submit a sandbox credit.'], ['3', 'Verify', gateway === 'razorpay' ? 'Your backend verifies the HMAC signature before crediting.' : 'Setu notifies your backend when payment settles.']].map(([number, title, text]) => <div key={number} className="rounded-2xl border border-[#eadfc9] bg-white/65 p-4"><span className="text-xs font-bold text-orange-600">{number}</span><h3 className="mt-1 font-semibold text-slate-800">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div>)}</div>
  </AppLayout>;
}