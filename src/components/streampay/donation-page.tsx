import React, { useState, useEffect } from 'react';
import { useStream } from '../../context/StreamContext';
import { useTheme } from '../../context/ThemeContext';
import {
  getSuperChatTier,
  DONATION_PRESETS_INR,
  getMaxMessageLength,
} from '../../lib/donation-rules';
import { formatCurrency, formatTimeAgo } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Heart,
  ExternalLink,
  Radio,
  Clock,
  Play,
  Tv,
  AlertCircle,
  RefreshCw,
  Mail,
  User,
} from 'lucide-react';

export const DonationPage: React.FC = () => {
  const { profile, liveStream, refreshLiveStatus, donations, showToast } = useStream();
  const { themeConfig } = useTheme();

  // Donation form state in INR
  const [amount, setAmount] = useState<number>(100);
  const [supporterName, setSupporterName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  // Handle live stream thumbnail updates and fallback gracefully
  const [thumbQualityFallback, setThumbQualityFallback] = useState<boolean>(false);

  useEffect(() => {
    setThumbQualityFallback(false);
  }, [liveStream.videoId]);

  const currentLiveThumbnail =
    thumbQualityFallback && liveStream.videoId
      ? `https://i.ytimg.com/vi/${liveStream.videoId}/mqdefault.jpg`
      : liveStream.thumbnailUrl ||
        (liveStream.videoId ? `https://i.ytimg.com/vi/${liveStream.videoId}/hqdefault.jpg` : '');

  const maxMessageLength = getMaxMessageLength(amount);
  const isMessageEligible = maxMessageLength > 0;
  const currentTier = getSuperChatTier(amount);

  // Maximum of 5 newest real superchats sorted by creation time
  const recentSuperchats = donations
    .filter((d) => !d.isSample)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    const newMax = getMaxMessageLength(val);
    if (newMax === 0) {
      setMessage('');
    } else {
      setMessage((prev) => prev.slice(0, newMax));
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setAmount(0);
      setMessage('');
      return;
    }
    const val = parseFloat(raw);
    if (isNaN(val)) {
      setAmount(0);
      setMessage('');
    } else {
      const sanitized = Math.min(Math.max(0, val), 10000);
      setAmount(sanitized);
      const newMax = getMaxMessageLength(sanitized);
      if (newMax === 0) {
        setMessage('');
      } else {
        setMessage((prev) => prev.slice(0, newMax));
      }
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (val.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val.trim())) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError(null);
      }
    } else {
      setEmailError(null);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isMessageEligible || maxMessageLength <= 0) {
      setMessage('');
      return;
    }
    const text = e.target.value.slice(0, maxMessageLength);
    setMessage(text);
  };

  const handleMessagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isMessageEligible || maxMessageLength <= 0) {
      e.preventDefault();
      return;
    }
    const pasted = e.clipboardData.getData('text');
    const textarea = e.currentTarget;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const current = message;
    const availableSpace = maxMessageLength - (current.length - (end - start));
    if (availableSpace <= 0) {
      e.preventDefault();
      return;
    }
    if (pasted.length > availableSpace) {
      e.preventDefault();
      const insert = pasted.slice(0, availableSpace);
      const nextText = (current.slice(0, start) + insert + current.slice(end)).slice(0, maxMessageLength);
      setMessage(nextText);
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email if provided
    if (email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError('Please enter a valid email address.');
        showToast('Please check your email address format.', 'error');
        return;
      }
    }

    if (amount < 1 || amount > 10000) {
      showToast('Donation amount must be between ₹1 and ₹10,000', 'error');
      return;
    }

    const currentMax = getMaxMessageLength(amount);

    if (amount < 20 && message.trim().length > 0) {
      showToast('Messages are only available for donations of ₹20 or above.', 'error');
      setMessage('');
      return;
    }

    if (message.length > currentMax) {
      showToast(`Message cannot exceed ${currentMax} characters for ₹${amount}.`, 'error');
      setMessage((prev) => prev.slice(0, currentMax));
      return;
    }

    // Payment gateway integration coming in Phase 2
    showToast('Payment setup is coming soon.', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto px-3.5 sm:px-6 py-4 sm:py-7 space-y-6 sm:space-y-8">
      {/* 
        ========================================================================
        TOP SECTION:
        1. YouTube channel logo
        2. Official YouTube channel name
        3. Current live stream thumbnail, if live
        4. Actual live stream title
        5. Watch on YouTube button
        ========================================================================
      */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-900/40 border border-slate-800 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4">
        <div
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: themeConfig.primaryColor }}
        />

        {/* Channel setup prompt if not yet configured in admin */}
        {!profile.isConfigured && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>No YouTube Channel Connected:</strong> Open the <strong>Creator Dashboard → YouTube Live Settings</strong> to connect your channel handle (e.g. <code>@MyGamingChannel</code>).
              </span>
            </div>
          </div>
        )}

        {/* Quick refresh stream status button in top corner */}
        {profile.handle && (
          <div className="flex justify-end -mb-1">
            <button
              onClick={() => refreshLiveStatus()}
              disabled={liveStream.isLoading}
              title="Refresh live stream detection status"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1 px-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${liveStream.isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Refresh Status</span>
            </button>
          </div>
        )}

        {/* 1. YouTube Channel Logo & 2. Official YouTube Channel Name with Handle directly BELOW */}
        <div className="flex flex-col items-center justify-center text-center">
          {/* 1. YouTube Channel Logo */}
          <div className="relative shrink-0 mb-2.5">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.channelName}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border border-slate-700 shadow-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <Radio className="w-8 h-8 text-[var(--theme-primary)]" />
              </div>
            )}

            {/* Live pulse indicator badge */}
            {liveStream.isLive && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-red-600 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-md flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LIVE
              </span>
            )}
          </div>

          {/* 2. Official YouTube Channel Name & Handle directly BELOW */}
          <div className="flex flex-col items-center justify-center text-center gap-1.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight text-center">
              {profile.channelName || 'StreamerPay Creator'}
            </h1>
            {profile.handle && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {profile.handle}
              </span>
            )}
          </div>
        </div>

        {/* 
          3. Current live stream thumbnail, if live
          4. Actual live stream title
          5. Watch on YouTube button
        */}
        {liveStream.isLive && liveStream.videoId ? (
          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950/80 shadow-md transition-all">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 p-3.5 items-center">
              {/* 3. Current live stream thumbnail (clickable) */}
              <div className="sm:col-span-5 relative group">
                <a
                  href={liveStream.watchUrl || `https://www.youtube.com/watch?v=${liveStream.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block relative rounded-lg overflow-hidden border border-slate-700 aspect-video shadow-md group-hover:ring-2 group-hover:ring-red-500 transition-all cursor-pointer bg-slate-900"
                  title="Click to open YouTube Live Stream"
                >
                  <img
                    src={currentLiveThumbnail}
                    alt={liveStream.title || 'Live Stream Thumbnail'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => {
                      if (!thumbQualityFallback && liveStream.videoId) {
                        setThumbQualityFallback(true);
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white translate-x-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] font-extrabold tracking-wider uppercase">
                    Live
                  </span>
                </a>
              </div>

              {/* 4. Actual live stream title & 5. Watch on YouTube button */}
              <div className="sm:col-span-7 space-y-2 text-center sm:text-left">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center justify-center sm:justify-start gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Currently Live
                  </span>
                  <h2 className="text-sm sm:text-base font-bold text-white line-clamp-2 leading-snug">
                    {liveStream.title}
                  </h2>
                </div>

                {/* 5. Watch on YouTube button */}
                <div>
                  <a
                    href={liveStream.watchUrl || `https://www.youtube.com/watch?v=${liveStream.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 fill-white" />
                    <span>Watch on YouTube</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Clean OFFLINE State */
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                <Tv className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-200">Stream Currently Offline</span>
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Offline
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {profile.isConfigured
                    ? 'Super Chats and tips sent here will trigger live on stream when broadcasting.'
                    : 'Configure your YouTube handle in the Creator Studio to auto-detect live status.'}
                </p>
              </div>
            </div>

            {profile.channelUrl && (
              <a
                href={profile.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition-colors"
              >
                <span>Visit Channel</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>
        )}
      </section>

      {/* 
        ========================================================================
        COMPACT DONATION FORM:
        - 5 presets in one row: ₹20, ₹50, ₹100, ₹500, ₹1,000
        - Custom amount field
        - Your Name (Handle removed)
        - Email Address (Optional) with helper text
        - Message field
        - Live Message Preview (ONLY Donor Name and Message)
        - Payment Options (UPI, Google Pay, RuPay, Net Banking)
        - Submit button
        ========================================================================
      */}
      {/* 
        ========================================================================
        DONATION FORM:
        A. Send Support heading
        B. Your Name field
        C. Donation amount selector
        D. Message input field
        E. Live Message Preview
        F. Email Address field
        G. Proceed to Payment button
        ========================================================================
      */}
      <section className="bg-slate-900/85 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-xl space-y-5">
        {/* A. Send Your Support Heading */}
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
          <Heart className="w-4 h-4 text-[var(--theme-primary)] fill-[var(--theme-primary)]/30" />
          <h2 className="text-base sm:text-lg font-bold text-white">Send Your Support</h2>
        </div>

        <form onSubmit={handleProceedToPayment} className="space-y-4">
          {/* B. Name Field: Directly below Send Support heading */}
          <div className="space-y-1">
            <Input
              label="Name"
              labelClassName="normal-case"
              placeholder="Enter your name"
              value={supporterName}
              onChange={(e) => setSupporterName(e.target.value)}
              maxLength={40}
              leftAddon={<User className="w-3.5 h-3.5 text-slate-400" />}
              className="py-2 text-xs sm:text-sm"
            />
          </div>

          {/* C. Donation Amount Selector */}
          <div className="space-y-2">
            <div>
              <label className="font-semibold text-slate-300 tracking-wider block text-[11px]">
                Select Amount (INR ₹)
              </label>
            </div>

            {/* 5 preset amounts: ₹20, ₹50, ₹100, ₹500, ₹1,000 */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 w-full">
              {DONATION_PRESETS_INR.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountSelect(preset)}
                  className={`w-full py-2 sm:py-2.5 px-0.5 sm:px-2 text-center rounded-xl text-[11px] min-[360px]:text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    amount === preset
                      ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/15 text-white ring-2 ring-[var(--theme-primary)]/30 shadow-sm'
                      : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>

            {/* Custom amount field with helper text aligned bottom-right */}
            <div className="pt-1 space-y-1">
              <Input
                type="number"
                min={1}
                max={10000}
                step="1"
                value={amount === 0 ? '' : amount}
                onChange={handleCustomAmountChange}
                leftAddon={<span className="font-bold text-slate-300 text-sm">₹</span>}
                placeholder="Custom amount"
                className="py-2 text-xs sm:text-sm w-full"
              />
              <div className="flex justify-end">
                <span className="text-[11px] text-slate-400 font-normal">
                  Between ₹1–₹10,000
                </span>
              </div>
            </div>
          </div>

          {/* D. Message Input Field: Directly below donation amount selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="supporter-message" className="font-semibold text-slate-300 tracking-wider text-[11px]">
                Message
              </label>
            </div>

            <textarea
              id="supporter-message"
              rows={3}
              maxLength={maxMessageLength}
              value={isMessageEligible ? message : ''}
              onChange={handleMessageChange}
              onPaste={handleMessagePaste}
              disabled={!isMessageEligible}
              placeholder={
                isMessageEligible
                  ? 'Write your message'
                  : 'Available for donations of ₹20 or above'
              }
              className="w-full min-h-[72px] sm:min-h-[76px] rounded-xl bg-slate-900/90 border border-slate-700/80 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 resize-none transition-all leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-950/60"
            />

            <div className="flex justify-end -mt-0.5">
              <span
                className={`font-mono text-[11px] ${
                  !isMessageEligible
                    ? 'text-slate-600'
                    : message.length >= maxMessageLength && maxMessageLength > 0
                    ? 'text-rose-400 font-bold'
                    : 'text-slate-400'
                }`}
              >
                {isMessageEligible ? message.length : 0}/{maxMessageLength}
              </span>
            </div>
          </div>

          {/* E. Message Preview: MUST appear immediately AFTER Message input */}
          <div className="space-y-1 -mt-1.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 block">
              Message Preview
            </span>
            <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-md">
              {/* Header with YouTube Super Chat tier color */}
              <div
                className="px-3.5 py-2 flex items-center justify-between gap-2.5 transition-colors duration-200"
                style={{
                  backgroundColor: currentTier.headerBg,
                  color: currentTier.textColor || '#FFFFFF',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center font-bold text-[10px] shrink-0 border border-white/20">
                    {(supporterName.trim() || 'Y')[0].toUpperCase()}
                  </div>
                  <span className="font-bold text-xs sm:text-sm truncate">
                    {supporterName.trim() || 'Your Name'}
                  </span>
                </div>
                <span className="font-extrabold text-xs sm:text-sm shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>

              {/* Message body with YouTube Super Chat tier contentBg - only shown for donations above ₹20 */}
              {amount > 20 && (
                <div
                  className="px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed transition-colors duration-200 break-words"
                  style={{
                    backgroundColor: currentTier.contentBg,
                    color: currentTier.textColor || '#FFFFFF',
                  }}
                >
                  {message.trim() ? (
                    <p className="whitespace-pre-wrap">{message.trim()}</p>
                  ) : (
                    <p className="italic opacity-70 text-xs">
                      Your message will appear here on the livestream overlay...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* F. Email Address: Directly below Live Message Preview */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label htmlFor="supporter-email" className="text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <span className="text-[11px] text-slate-500 font-normal">Optional</span>
            </div>
            <Input
              id="supporter-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={handleEmailChange}
              error={emailError || undefined}
              leftAddon={<Mail className="w-3.5 h-3.5 text-slate-400" />}
              className="py-2 text-xs sm:text-sm"
            />
            <p className="text-[11px] text-slate-400 pl-0.5">
              You will receive payment receipt on this email
            </p>
          </div>

          {/* G. Proceed to Payment Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full text-sm sm:text-base font-bold shadow-lg py-2.5 sm:py-3 cursor-pointer"
            leftIcon={<Heart className="w-4 h-4 fill-current shrink-0" />}
          >
            Proceed to Payment
          </Button>
        </form>
      </section>

      {/* 
        ========================================================================
        RECENT SUPERCHATS (NEAR BOTTOM, BEFORE FOOTER)
        - Max 5 newest real superchats
        - No tabs/filters
        - Shows "No superchats yet. Be the first to support!" if none
        ========================================================================
      */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-lg space-y-4">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Recent Superchats
          </h3>
          <p className="text-xs text-slate-400">
            Livestream supporter messages in Indian Rupees (₹)
          </p>
        </div>

        {recentSuperchats.length === 0 ? (
          <div className="py-8 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-2">
            <Heart className="w-6 h-6 text-slate-600 mx-auto" />
            <p className="text-sm font-medium text-slate-300">
              No superchats yet. Be the first to support!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentSuperchats.map((item) => {
              const tierConfig = getSuperChatTier(item.amount);
              return (
                <div
                  key={item.id}
                  className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-sm flex flex-col justify-between"
                >
                  {/* Header */}
                  <div
                    className="px-3 py-2 flex items-center justify-between gap-2.5 text-white"
                    style={{ backgroundColor: tierConfig.headerBg }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-black/25 flex items-center justify-center font-bold text-[10px] shrink-0 border border-white/20">
                        {item.supporterName[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate leading-tight">
                          {item.supporterName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] opacity-90">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="font-extrabold text-sm tracking-tight shrink-0">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>

                  {/* Content */}
                  {item.message ? (
                    <div
                      className="p-3 text-xs font-medium flex-1 text-white leading-relaxed"
                      style={{ backgroundColor: tierConfig.contentBg }}
                    >
                      <p className="break-words">{item.message}</p>
                    </div>
                  ) : (
                    <div
                      className="p-1.5 text-[10px] italic text-center opacity-70 text-white"
                      style={{ backgroundColor: tierConfig.contentBg }}
                    >
                      Chat interaction
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
