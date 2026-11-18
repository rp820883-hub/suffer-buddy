import React, { useState } from 'react';
import { Lock, Phone, ShieldCheck, X } from 'lucide-react';
import { api, setStoredToken } from '../lib/api';
import type { RolePreference, UserProfile } from '../types';

interface OtpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (user: UserProfile) => void;
  contextHint?: string;
}

const DEMO_ACCOUNTS = [
  { label: 'Rohan Patil (Driver · Jalgaon → Pune)', mobile: '9823011223' },
  { label: 'Neha Kulkarni (Rider)', mobile: '9890123456' },
];

export const OtpAuthModal: React.FC<OtpAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  contextHint,
}) => {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [existingName, setExistingName] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rolePreference, setRolePreference] = useState<RolePreference>('both');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactMobile, setEmergencyContactMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(mobile);
      setOtpPreview(res.otpPreview);
      setIsNewUser(res.isNewUser);
      setExistingName(res.existingName);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyOtp({
        mobile,
        otp,
        name: isNewUser ? name : undefined,
        rolePreference: isNewUser ? rolePreference : undefined,
        emergencyContactName: isNewUser ? emergencyContactName : undefined,
        emergencyContactMobile: isNewUser ? emergencyContactMobile : undefined,
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
      setStep('mobile');
      setOtp('');
      setOtpPreview(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-modal-title"
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 id="otp-modal-title" className="text-base font-bold text-slate-900">
              Mobile OTP Verification
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {contextHint ||
              'Suffer Buddy is free for everyone. Verified mobile number and OTP login is mandatory to post rides, negotiate fares, or book seats.'}
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {step === 'mobile' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="mobile-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  10-Digit Mobile Number
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900 bg-white">
                  <span className="px-3 py-3 text-sm font-mono font-medium text-slate-600 bg-slate-50 border-r border-slate-200">
                    +91
                  </span>
                  <input
                    id="mobile-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    placeholder="9823011223"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3.5 py-3 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-1">
                <p className="text-xs font-medium text-slate-500 mb-2">Quick-fill verified test accounts:</p>
                <div className="grid grid-cols-1 gap-2">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.mobile}
                      type="button"
                      onClick={() => setMobile(acc.mobile)}
                      className="flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      <span className="truncate">{acc.label}</span>
                      <span className="font-mono text-slate-500 shrink-0 ml-2">{acc.mobile}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || mobile.length !== 10}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>{loading ? 'Sending OTP...' : 'Send 6-Digit OTP'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {otpPreview && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-900">SMS Verification Code</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Sent to <span className="font-mono">+91 {mobile}</span> · Valid 5 min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(otpPreview)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-sm font-bold tracking-wider transition-colors shrink-0"
                    title="Click to autofill OTP"
                  >
                    {otpPreview}
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="otp-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Enter 6-Digit OTP
                </label>
                <input
                  id="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3.5 py-3 text-base font-mono tracking-[0.25em] text-center border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {existingName && !isNewUser && (
                <p className="text-xs text-emerald-700 font-medium">
                  Welcome back, {existingName}. Verify OTP to continue.
                </p>
              )}

              {isNewUser && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-800">Complete your traveler profile</p>
                  <div>
                    <label htmlFor="profile-name" className="block text-xs font-medium text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      required
                      placeholder="e.g. Aditya Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-slate-600 mb-1">Primary Use</span>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                      {(['rider', 'driver', 'both'] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setRolePreference(role)}
                          className={`py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
                            rolePreference === role
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label htmlFor="emg-name" className="block text-xs font-medium text-slate-600 mb-1">
                        SOS Contact Name
                      </label>
                      <input
                        id="emg-name"
                        type="text"
                        placeholder="Optional"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="emg-mobile" className="block text-xs font-medium text-slate-600 mb-1">
                        SOS Mobile
                      </label>
                      <input
                        id="emg-mobile"
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit"
                        value={emergencyContactMobile}
                        onChange={(e) => setEmergencyContactMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setError(null);
                  }}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
