import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onPasswordResetSuccess?: (email: string) => void;
}

type Step = 'request' | 'verify' | 'reset' | 'done';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  resetToken?: string;
  remainingAttempts?: number;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordDialog = ({
  open,
  onOpenChange,
  initialEmail,
  onPasswordResetSuccess,
}: ForgotPasswordDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = useMemo(
    () => import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/auth',
    []
  );

  const resetState = () => {
    setStep('request');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setLoading(false);
  };

  const closeDialog = () => {
    onOpenChange(false);
    resetState();
  };

  const isEmailValid = emailRegex.test(email.trim().toLowerCase());

  const post = async (path: string, payload: Record<string, unknown>) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ApiResponse;
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Request failed.');
    }

    return data;
  };

  const requestOtp = async () => {
    if (!isEmailValid) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = await post('/password-reset/request-otp', { email: email.trim() });
      toast({ title: 'OTP sent', description: data.message || 'Check your email for the OTP code.' });
      setStep('verify');
    } catch (error) {
      toast({
        title: 'Failed to send OTP',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      toast({ title: 'Invalid OTP', description: 'OTP must be 6 digits.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = await post('/password-reset/verify-otp', {
        email: email.trim(),
        otp: otp.trim(),
      });

      if (!data.resetToken) {
        throw new Error('Reset token not received from server.');
      }

      setResetToken(data.resetToken);
      setStep('reset');
      toast({ title: 'OTP verified', description: 'Set your new password.' });
    } catch (error) {
      toast({
        title: 'OTP verification failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Password mismatch', description: 'Password and confirm password must match.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await post('/password-reset/reset-password', {
        email: email.trim(),
        newPassword,
        resetToken,
      });

      setStep('done');
      onPasswordResetSuccess?.(email.trim());
      toast({ title: 'Password updated', description: 'You can now login with your new password.' });
    } catch (error) {
      toast({
        title: 'Password reset failed',
        description: error instanceof Error ? error.message : 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forgot password</DialogTitle>
          <DialogDescription>
            {step === 'request' && 'Enter your email and we will send a one-time OTP to reset your password.'}
            {step === 'verify' && 'Enter the 6-digit OTP sent to your email.'}
            {step === 'reset' && 'Create a new password for your account.'}
            {step === 'done' && 'Your password has been reset successfully.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'request' && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              OTP was sent to <span className="font-medium text-foreground">{email}</span>
            </p>
            <label className="text-sm font-medium">OTP code</label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={requestOtp}
              disabled={loading}
            >
              Resend OTP
            </button>
          </div>
        )}

        {step === 'reset' && (
          <div className="space-y-3">
            <label className="text-sm font-medium">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <label className="text-sm font-medium">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {step === 'done' && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            Password reset is complete. You can close this dialog and login with your new password.
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step !== 'done' && (
            <Button variant="outline" onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>
          )}

          {step === 'request' && (
            <Button onClick={requestOtp} disabled={loading || !isEmailValid}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          )}

          {step === 'verify' && (
            <Button onClick={verifyOtp} disabled={loading || otp.trim().length !== 6}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
          )}

          {step === 'reset' && (
            <Button onClick={submitNewPassword} disabled={loading || !newPassword || !confirmPassword}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          )}

          {step === 'done' && (
            <Button onClick={closeDialog}>
              Back to login
            </Button>
          )}
        </DialogFooter>

        <p className="text-xs text-muted-foreground">
          For Google sign-in accounts, password changes are managed by Google account recovery.
        </p>
      </DialogContent>
    </Dialog>
  );
};
