import { createContext, useContext, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { CheckCircle2, Loader2, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openRazorpayCheckout } from '@/lib/razorpay';

export const PaymentContext = createContext({ userId: null, sessionId: null });

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function PaymentCard({ data }) {
  const { user } = useUser();
  const { userId, sessionId } = useContext(PaymentContext);
  const [status, setStatus] = useState('ready'); // ready | paying | paid | failed
  const [error, setError] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const amount = Number(data?.amount) || 0;
  const isSip = data?.kind === 'sip';
  const purpose = data?.purpose || 'DhanMitra payment';

  async function pay() {
    setStatus('paying');
    setError('');
    try {
      const verified = await openRazorpayCheckout({
        order: { order_id: data.order_id, amount: amount * 100, currency: 'INR', purpose },
        user,
        sessionId,
        userId,
      });
      if (verified?.success) {
        setPaymentId(verified.razorpay_payment_id || '');
        setStatus('paid');
      } else {
        setStatus('ready');
      }
    } catch (err) {
      setError(err.message);
      setStatus('failed');
    }
  }

  return (
    <div className="mt-2.5 max-w-[340px] rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/60 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700">
          <ShieldCheck className="h-3 w-3" /> RAZORPAY · TEST
        </span>
        {isSip && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
            {data.frequency || 'monthly'} SIP
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-900">{money.format(amount)}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{purpose}</p>
      </div>

      {isSip && data.next_date && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-700">
          <Wallet className="h-3 w-3" /> Next: {new Date(data.next_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      {status === 'paid' ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
          <p className="mt-1 text-sm font-semibold text-emerald-800">Payment done</p>
          {isSip && <p className="text-[11px] text-emerald-700">Your SIP is now active. First installment verified.</p>}
          {paymentId && <p className="mt-1 truncate font-mono text-[10px] text-emerald-600">{paymentId}</p>}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={pay}
            disabled={status === 'paying' || !data.order_id}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-all',
              status === 'paying'
                ? 'cursor-wait bg-emerald-400'
                : 'bg-[#13795b] hover:bg-[#0f5f47] active:scale-[0.98] shadow-md shadow-emerald-200',
            )}
          >
            {status === 'paying' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            {status === 'paying' ? 'Opening checkout…' : `Pay ${money.format(amount)}`}
          </button>
          {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
          <p className="mt-2 text-center text-[10px] text-slate-400">Test mode · no real money moved</p>
        </>
      )}
    </div>
  );
}