import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Send, Copy, Check, Link as LinkIcon, Unlink } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function SettingsPage() {
  const { user } = useUser();
  const [linkStatus, setLinkStatus] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [botUsername, setBotUsername] = useState('the DhanMitra Telegram bot');

  useEffect(() => {
    fetchLinkStatus();
  }, [user]);

  useEffect(() => {
    if (!user || linkStatus?.is_linked || !verificationCode) return undefined;
    const interval = window.setInterval(fetchLinkStatus, 3000);
    return () => window.clearInterval(interval);
  }, [user, linkStatus?.is_linked, verificationCode]);

  const fetchLinkStatus = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/telegram/link-status/${user.id}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLinkStatus(data);
    } catch (error) {
      console.error('Failed to fetch link status:', error);
    }
  };

  const generateLinkCode = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/telegram/generate-link-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.detail || data.message || 'Could not generate code');
      }
      setVerificationCode(data.verification_code);
      if (data.bot_username) setBotUsername(`@${data.bot_username}`);
    } catch (error) {
      console.error('Failed to generate link code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(verificationCode).catch((error) => {
      console.error('Failed to copy link code:', error);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const unlinkAccount = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to unlink your Telegram account?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/telegram/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.detail || data.message || 'Could not unlink account');
      }
      setLinkStatus({ is_linked: false });
      setVerificationCode('');
    } catch (error) {
      console.error('Failed to unlink account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
          <p className="text-slate-500">Manage your account preferences and connections</p>
        </motion.div>

        {/* Telegram Integration Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-orange-200 shadow-lg shadow-orange-100/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Telegram Integration</CardTitle>
                  <CardDescription>
                    Connect your Telegram account for personalized responses
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkStatus?.is_linked ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ Connected
                    </Badge>
                    {linkStatus.telegram_username && (
                      <span className="text-sm text-slate-600">
                        @{linkStatus.telegram_username}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      Your Telegram account is linked! You'll receive personalized responses based on your profile.
                    </p>
                  </div>

                  <Button
                    onClick={unlinkAccount}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    {isLoading ? 'Unlinking...' : 'Unlink Account'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      Connect your Telegram account to receive personalized financial advice based on your profile.
                    </p>
                  </div>

                  {!verificationCode ? (
                    <Button
                      onClick={generateLinkCode}
                      disabled={isLoading}
                      className="w-full bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {isLoading ? 'Generating...' : 'Generate Link Code'}
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-sm text-slate-600 mb-2">
                          Send this code to the DhanMitra Telegram bot:
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border-2 border-orange-300 rounded-lg px-4 py-3 text-center">
                            <span className="text-2xl font-mono font-bold text-orange-600">
                              {verificationCode}
                            </span>
                          </div>
                          <Button
                            onClick={copyToClipboard}
                            size="icon"
                            variant="outline"
                            className="shrink-0"
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Instructions:</strong>
                        </p>
                        <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                          <li>Open Telegram and find {botUsername}</li>
                          <li>Send <code className="bg-blue-100 px-1 rounded">/link {verificationCode}</code></li>
                          <li>Your account will be linked automatically</li>
                        </ol>
                      </div>

                      <Button
                        onClick={() => setVerificationCode('')}
                        variant="outline"
                        className="w-full"
                      >
                        Generate New Code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-800 text-lg">Telegram Bot Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Personalized financial advice based on your profile</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Voice message support for hands-free queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Government scheme recommendations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Multi-language support</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}