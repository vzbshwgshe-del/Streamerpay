import React, { useState } from 'react';
import { useStream } from '../../context/StreamContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Shield, Lock, User, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';

interface AdminLoginProps {
  onBackToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onBackToPublic }) => {
  const { loginAdmin } = useStream();
  const { themeConfig } = useTheme();

  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('streamer2026');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const ok = loginAdmin(username, password);
      setIsLoading(false);
      if (!ok) {
        setError('Invalid credentials. Please enter valid creator credentials or use demo credentials.');
      }
    }, 600);
  };

  const handleQuickDemoFill = () => {
    setUsername('admin');
    setPassword('streamer2026');
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Top Back link */}
        <button
          onClick={onBackToPublic}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Public Donation Page</span>
        </button>

        {/* Heading */}
        <div className="text-center space-y-2">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg mb-3"
            style={{ backgroundColor: themeConfig.primaryColor }}
          >
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Creator Studio Login</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sign in to manage donations, overlays, themes, and stream settings.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            leftAddon={<User className="w-4 h-4" />}
            placeholder="admin or creator@streamer.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftAddon={<Lock className="w-4 h-4" />}
            placeholder="Enter your creator password"
            required
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
              />
              <span>Remember session</span>
            </label>
            <span className="text-slate-500">Encrypted session</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full font-bold shadow-lg"
            isLoading={isLoading}
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            Sign In to Dashboard
          </Button>
        </form>

        {/* Demo Helper box */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Demo Testing Credentials
            </span>
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="text-[11px] text-[var(--theme-primary)] hover:underline font-medium cursor-pointer"
            >
              Fill Demo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl">
            <div>User: <span className="text-slate-200">admin</span></div>
            <div>Pass: <span className="text-slate-200">streamer2026</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
