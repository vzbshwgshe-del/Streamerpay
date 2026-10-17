import React, { useState } from 'react';
import { useStream } from '../../context/StreamContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/button';
import {
  Radio,
  Sliders,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  ShieldCheck,
  FileText,
  HelpCircle,
  Mail,
} from 'lucide-react';

interface ShellProps {
  currentView: 'public' | 'admin' | 'overlay';
  onNavigate: (view: 'public' | 'admin' | 'overlay') => void;
  children: React.ReactNode;
}

type FooterModalType = 'support' | 'privacy' | 'terms' | null;

export const Shell: React.FC<ShellProps> = ({ currentView, onNavigate, children }) => {
  const { profile, liveStream, toasts, removeToast } = useStream();
  const { themeConfig, isPreviewing, resetPreview, applyTheme } = useTheme();

  const [activeModal, setActiveModal] = useState<FooterModalType>(null);

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100 selection:bg-[var(--theme-primary)]/30 selection:text-white">
      {/* Theme preview active alert banner */}
      {isPreviewing && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 font-medium px-4 py-2 flex items-center justify-between text-xs sm:text-sm shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Previewing theme: <strong>{themeConfig.name}</strong>. Changes are not saved yet.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applyTheme()}
              className="px-2.5 py-1 bg-slate-950 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
            >
              Apply Theme
            </button>
            <button
              onClick={() => resetPreview()}
              className="px-2.5 py-1 bg-white/30 text-slate-950 rounded-lg text-xs font-semibold hover:bg-white/40 transition-colors cursor-pointer"
            >
              Cancel Preview
            </button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      {currentView !== 'overlay' && (
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0b0e14]/85 border-b border-slate-800/80 transition-colors">
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-6">
            {/* Left: StreamerPay Logo */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => onNavigate('public')}
                className="flex items-center gap-2 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] rounded-lg p-0.5 shrink-0"
                aria-label="Go to StreamerPay Home"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 border border-slate-700/80 flex items-center justify-center text-[var(--theme-primary)] shadow-sm group-hover:scale-105 transition-transform">
                  <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">Streamer</span>
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--theme-primary)]">Pay</span>
                    {currentView === 'admin' && (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 ml-1">
                        Studio
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block leading-none">
                    Live Super Chat & Tipping
                  </p>
                </div>
              </button>

              {/* Creator Live Status pill (in public view) */}
              {currentView === 'public' && liveStream.isLive && (
                <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 truncate">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="font-medium text-slate-300 truncate">
                    {profile.channelName || 'Streamer'} is LIVE
                  </span>
                </div>
              )}
            </div>

            {/* Right: Compact Clearly Visible Dashboard / Donation Page Button */}
            <div className="flex items-center gap-2 shrink-0">
              {currentView === 'public' ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Sliders className="w-3.5 h-3.5 shrink-0" />}
                  onClick={() => onNavigate('admin')}
                  className="font-semibold text-xs px-2.5 py-1.5 h-8 min-h-[32px] sm:px-3 sm:py-1.5 shadow-sm whitespace-nowrap"
                  aria-label="Open Creator Dashboard"
                >
                  Dashboard
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowLeft className="w-3 h-3 shrink-0" />}
                  rightIcon={<ExternalLink className="w-3 h-3 opacity-60 hidden sm:inline" />}
                  onClick={() => onNavigate('public')}
                  className="font-medium text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 h-7.5 sm:h-8 min-h-[30px] sm:min-h-[32px] whitespace-nowrap shadow-sm"
                  aria-label="Back to Public Donation Page"
                >
                  Donation Page
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Professional Footer (for public page) */}
      {currentView === 'public' && (
        <footer className="border-t border-slate-800/80 bg-[#07090e] py-8 sm:py-10 text-slate-400 text-xs mt-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
              {/* Branding & Short Description */}
              <div className="space-y-2 max-w-sm">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[var(--theme-primary)]">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight text-white">Streamer</span>
                  <span className="font-extrabold text-sm tracking-tight text-[var(--theme-primary)] -ml-1">Pay</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Support your favourite creators with secure and simple donations.
                </p>
              </div>

              {/* Links: Customer Support, Privacy Policy, Terms of Service, Creator Login */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveModal('support')}
                  className="hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                >
                  Customer Support
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => setActiveModal('privacy')}
                  className="hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => setActiveModal('terms')}
                  className="hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                >
                  Terms of Service
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                >
                  Creator Dashboard
                </button>
              </div>
            </div>

            {/* Copyright notice with current year */}
            <div className="pt-6 border-t border-slate-800/60 flex items-center justify-center text-[11px] text-slate-500 text-center">
              <p>© {currentYear} StreamerPay. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}

      {/* Modal Dialogs for Customer Support, Privacy Policy, and Terms of Service */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {activeModal === 'support' && <HelpCircle className="w-5 h-5 text-[var(--theme-primary)]" />}
                {activeModal === 'privacy' && <ShieldCheck className="w-5 h-5 text-[var(--theme-primary)]" />}
                {activeModal === 'terms' && <FileText className="w-5 h-5 text-[var(--theme-primary)]" />}
                <h3 className="font-bold text-white text-base">
                  {activeModal === 'support' && 'Customer Support'}
                  {activeModal === 'privacy' && 'Privacy Policy'}
                  {activeModal === 'terms' && 'Terms of Service'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Support Content */}
            {activeModal === 'support' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  Need assistance with a donation or have a question about StreamerPay? We are here to help.
                </p>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Mail className="w-4 h-4 text-[var(--theme-primary)]" />
                    <span>Support Desk Contact:</span>
                  </div>
                  <p className="font-mono text-xs text-slate-300">
                    support@streamerpay.live
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Support requests are handled by the platform team. Responses are typically provided within 24 to 48 hours on business days.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300">Creator-Specific Questions</p>
                  <p>
                    For questions about stream content, rewards, or stream schedules, please contact the creator directly through their official channel links.
                  </p>
                </div>
              </div>
            )}

            {/* Privacy Policy Content */}
            {activeModal === 'privacy' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  StreamerPay respects your privacy. This policy describes how donor information is collected and processed.
                </p>
                <div className="space-y-2 text-xs">
                  <p>
                    <strong className="text-white">1. Information You Provide:</strong> When you send a Super Chat, you provide your name and an optional message, which are displayed on the public livestream and overlay. Entering an email address is strictly optional and is used only if you wish to receive transaction confirmations.
                  </p>
                  <p>
                    <strong className="text-white">2. Public Information:</strong> Your entered name and message are publicly broadcast to the livestream and displayed in the recent supporter feed. Do not include private personal details in your public message.
                  </p>
                  <p>
                    <strong className="text-white">3. Payment Information:</strong> Payment processing is handled by regulated third-party payment gateways. StreamerPay does not store or process your bank account details or card numbers.
                  </p>
                  <p>
                    <strong className="text-white">4. Data Retention:</strong> Transaction records are maintained for creator audit purposes and dashboard reconciliation.
                  </p>
                </div>
              </div>
            )}

            {/* Terms of Service Content */}
            {activeModal === 'terms' && (
              <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <p>
                  By sending a donation or Super Chat through StreamerPay, you acknowledge and agree to the following terms:
                </p>
                <div className="space-y-2 text-xs">
                  <p>
                    <strong className="text-white">1. Nature of Donations:</strong> Contributions made through StreamerPay are voluntary financial gifts to support content creators. Donations do not constitute purchase of goods, investments, or commercial contracts.
                  </p>
                  <p>
                    <strong className="text-white">2. Refund Policy:</strong> Because donations trigger real-time digital alerts on livestreams, all donations are final and non-refundable unless required by applicable law.
                  </p>
                  <p>
                    <strong className="text-white">3. Appropriate Conduct:</strong> Messages containing hate speech, harassment, spam, unlawful material, or personally identifiable information of third parties are strictly prohibited and may be removed or moderated by the creator.
                  </p>
                  <p>
                    <strong className="text-white">4. Availability:</strong> Livestream overlay alerts are subject to stream software connectivity and creator broadcasting settings.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[var(--theme-primary)] shrink-0" />}
              <span className="text-slate-200 font-medium">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
