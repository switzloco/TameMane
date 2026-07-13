import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Mail, 
  Lock, 
  User, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { dbService } from '../../services/dbService';

export default function SyncModal({ isOpen, onClose, currentUser }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      setSuccessMsg('Signed in with Google successfully!');

      if (credential.user) {
        await dbService.migrateLocalToCloud(credential.user.uid);
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google Sign-In failed: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      let credential;
      if (isSignUp) {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Account created successfully!');
      } else {
        credential = await signInWithEmailAndPassword(auth, email, password);
        setSuccessMsg('Signed in successfully!');
      }

      // Run migration immediately after login/signup
      if (credential.user) {
        await dbService.migrateLocalToCloud(credential.user.uid);
      }
      
      // Delay closing to show success message
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      let friendlyError = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        friendlyError = 'Invalid email or password.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    setLoading(true);
    try {
      await signOut(auth);
      setSuccessMsg('Signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-dark-border bg-dark-bg/95 shadow-2xl glass-panel animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-bg/40">
          <div className="flex items-center gap-2">
            <Cloud className="text-blue-400" size={20} />
            <h2 className="text-lg font-bold text-dark-text">Cloud Sync</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-dark-muted hover:text-dark-text hover:bg-dark-muted/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentUser ? (
            /* Logged In View */
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-pulse">
                <CheckCircle size={32} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-dark-text">Connected to Cloud</h3>
                <p className="text-xs text-dark-muted mt-1 break-all px-2">
                  Currently syncing in real-time under: <br />
                  <span className="font-semibold text-blue-400">{currentUser.email}</span>
                </p>
              </div>
              <p className="text-[11px] text-emerald-500 bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-500/10">
                Data is secure and synced on all devices
              </p>

              {successMsg && (
                <p className="text-xs text-emerald-400 font-medium">{successMsg}</p>
              )}

              <div className="w-full pt-4 border-t border-dark-border/60 flex flex-col gap-2">
                <button
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-sm font-medium hover:bg-rose-950/20 hover:border-rose-500/50 transition-colors disabled:opacity-55"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                  Disconnect Sync
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-dark-muted/10 border border-dark-border text-dark-text text-sm font-medium hover:bg-dark-muted/20 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Signed Out / Login Form View */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-dark-text">Keep your data in sync</h3>
                <p className="text-xs text-dark-muted mt-1 leading-relaxed">
                  Sign in or sign up to backup your properties, tasks, and transactions in real-time across your phone, PC, and other computers.
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-dark-border bg-dark-bg/60 text-dark-text text-sm font-semibold hover:bg-dark-muted/10 transition-colors disabled:opacity-55"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.27 2.705 1.34 6.66l3.926 3.105z"
                  />
                  <path
                    fill="#4285F4"
                    d="M16.04 15.34c-1.07.727-2.455 1.16-4.04 1.16a7.077 7.077 0 0 1-6.734-4.855L1.34 14.75C3.27 18.705 7.27 21.41 12 21.41c3.155 0 6.02-.127 8.163-3.127l-4.123-2.943z"
                  />
                  <path
                    fill="#34A853"
                    d="M23.49 12.27c0-.818-.082-1.609-.227-2.373H12v4.51h6.464a5.536 5.536 0 0 1-2.4 3.636l4.123 2.943C22.59 18.8 23.49 15.827 23.49 12.27z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 11.645a6.973 6.973 0 0 1 0-2.28L1.34 6.26A11.947 11.947 0 0 0 0 12c0 2.055.518 4.0 1.34 5.74l3.926-3.105a6.973 6.973 0 0 1 0-2.99z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex items-center justify-center my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-dark-border/60"></div>
                </div>
                <span className="relative px-3 bg-dark-bg text-[10px] text-dark-muted font-semibold uppercase tracking-wider">
                  or
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-3.5">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-dark-muted/50"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-dark-muted uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-muted" size={16} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-dark-muted/50"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-400 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs">
                    <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:bg-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-55"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : isSignUp ? (
                    'Create Account & Sync'
                  ) : (
                    'Connect & Sync'
                  )}
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
