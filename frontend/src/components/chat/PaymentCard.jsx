import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getPaymentStatus } from '@/lib/api';

const STATUS_COLORS = {
  created: 'bg-blue-50 text-blue-700 border-blue-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  expired: 'bg-gray-50 text-gray-700 border-gray-200',
};

const STATUS_ICONS = {
  created: <Clock className="h-4 w-4" />,
  pending: <Loader2 className="h-4 w-4 animate-spin" />,
  success: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  expired: <Clock className="h-4 w-4" />,
};

export default function PaymentCard({ transaction, onStatusUpdate }) {
  const [status, setStatus] = useState(transaction.status || 'created');
  const [isLoading, setIsLoading] = useState(false);

  // Poll for status updates
  useEffect(() => {
    if (status === 'created' || status === 'pending') {
      const interval = setInterval(async () => {
        const result = await getPaymentStatus(transaction.transaction_id);
        if (result.success && result.data.status !== status) {
          setStatus(result.data.status);
          if (onStatusUpdate) {
            onStatusUpdate(result.data);
          }
        }
      }, 5000); // Check every 5 seconds
      
      // Stop polling after 2 minutes
      setTimeout(() => {
        clearInterval(interval);
      }, 120000);
      
      return () => clearInterval(interval);
    }
  }, [transaction.transaction_id, status]);

  const handlePay = () => {
    if (transaction.upi_deeplink) {
      // Open UPI app via deep link
      window.location.href = transaction.upi_deeplink;
    } else if (transaction.payment_link) {
      // Fallback to payment link
      window.open(transaction.payment_link, '_blank');
    }
  };

  const statusInfo = STATUS_COLORS[status] || STATUS_COLORS.created;
  const StatusIcon = STATUS_ICONS[status] || STATUS_ICONS.created;

  return (
    <Card className="max-w-sm border-orange-200 shadow-lg overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <span className="font-semibold text-sm">DhanMitra Payment</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo}`}>
            {StatusIcon}
            <span className="capitalize">{status}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="text-3xl font-bold text-slate-800 mb-1">
          ₹{transaction.amount?.toLocaleString()}
        </div>
        <p className="text-sm text-slate-500 mb-3">{transaction.purpose}</p>

        {/* QR Code */}
        {transaction.qr_code && (
          <div className="flex justify-center my-3">
            <img 
              src={transaction.qr_code} 
              alt="UPI QR Code" 
              className="w-32 h-32 rounded-lg border border-slate-200"
            />
          </div>
        )}

        {/* Action Button */}
        {status === 'created' && (
          <Button 
            onClick={handlePay}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          >
            💳 Pay Now
          </Button>
        )}

        {status === 'pending' && (
          <Button disabled className="w-full bg-yellow-100 text-yellow-700">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </Button>
        )}

        {status === 'success' && (
          <div className="text-center py-2 text-green-600 font-medium">
            ✅ Payment Successful!
          </div>
        )}

        {status === 'failed' && (
          <Button 
            onClick={handlePay}
            className="w-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          >
            🔄 Retry Payment
          </Button>
        )}

        {/* Transaction ID */}
        <div className="mt-3 pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            TXN: {transaction.transaction_id?.slice(0, 16)}...
          </p>
          <p className="text-xs text-slate-400">
            Expires: {new Date(transaction.expires_at).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}