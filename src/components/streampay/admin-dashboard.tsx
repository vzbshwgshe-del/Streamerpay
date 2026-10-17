import React, { useState } from 'react';
import { useStream, Donation } from '../../context/StreamContext';
import { useTheme, THEMES, ThemeId } from '../../context/ThemeContext';
import { getSuperChatTier, SUPER_CHAT_TIERS, formatPinDuration } from '../../lib/donation-rules';
import { formatCurrency, formatTimeAgo } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  LayoutDashboard,
  History,
  Youtube,
  CreditCard,
  Palette,
  Tv,
  Shield,
  LogOut,
  TrendingUp,
  DollarSign,
  Copy,
  ExternalLink,
  Volume2,
  VolumeX,
  Play,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Smartphone,
  Eye,
  X,
  Save,
  Radio,
  RefreshCw,
  CheckCircle,
  Menu,
  Clock,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'donations'
  | 'youtube'
  | 'payment'
  | 'theme'
  | 'overlay'
  | 'security'
  | 'logout';

interface AdminDashboardProps {
  onNavigatePublic: () => void;
  onNavigateOverlay: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigatePublic,
  onNavigateOverlay,
}) => {
  const {
    profile,
    liveStream,
    isDiscoveringChannel,
    saveChannelHandle,
    testChannelConnection,
    refreshLiveStatus,
    updateCustomThankYou,
    overlayConfig,
    updateOverlayConfig,
    triggerTestAlert,
    donations,
    exportDonationsCsv,
    logoutAdmin,
    showToast,
  } = useStream();

  const {
    savedTheme,
    previewTheme,
    activeTheme,
    themeConfig,
    isPreviewing,
    setPreview,
    applyTheme,
    resetPreview,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Tab B: Donations state (in INR)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDonationDetails, setSelectedDonationDetails] = useState<Donation | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'amount' | 'name'>('latest');

  // Tab C: YouTube Settings state
  const [channelHandleInput, setChannelHandleInput] = useState<string>(
    (profile.handle || '').replace(/^@+/, '')
  );
  const [channelError, setChannelError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    liveInfo?: string;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [isSavingChannel, setIsSavingChannel] = useState<boolean>(false);

  // Tab H: Security draft
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Tab I: Logout modal
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Calculations for Overview (in INR)
  const totalRevenue = donations.reduce((sum, d) => sum + d.amount, 0);
  const averageDonation = donations.length > 0 ? totalRevenue / donations.length : 0;
  const topTierDonations = donations.filter((d) => d.tier >= 5).length;

  // Donor name truncation rule: first 10 characters followed by '...' only if > 10 characters
  const formatDonorName = (name: string): string => {
    if (!name) return 'Anonymous';
    return name.length > 10 ? `${name.slice(0, 10)}...` : name;
  };

  // Filtered and sorted donations for Tab B (in INR)
  const sortedAndFilteredDonations = [...donations]
    .filter((d) => {
      const matchesSearch =
        d.supporterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.message.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return b.timestamp - a.timestamp;
      }
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      }
      if (sortBy === 'name') {
        return a.supporterName.localeCompare(b.supporterName);
      }
      return 0;
    });

  // OBS Overlay URL
  const overlayUrl = `${window.location.origin}/?overlay=true&token=${overlayConfig.token}`;

  const handleCopyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    showToast('OBS Overlay URL copied to clipboard!', 'success');
  };

  // YouTube handle save
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setChannelError(null);
    setTestResult(null);

    const cleanInput = channelHandleInput.trim().replace(/^@+/, '');
    if (!cleanInput) {
      setChannelError('Please enter your YouTube channel handle');
      return;
    }

    setIsSavingChannel(true);
    const result = await saveChannelHandle(`@${cleanInput}`);
    setIsSavingChannel(false);

    if (!result.success) {
      setChannelError(result.error || 'Failed to resolve YouTube channel.');
    } else {
      showToast(`Channel "${result.channel?.title}" saved successfully!`, 'success');
    }
  };

  // YouTube handle test connection
  const handleTestConnection = async () => {
    setChannelError(null);
    const cleanInput = channelHandleInput.trim().replace(/^@+/, '');
    if (!cleanInput) {
      setChannelError('Please enter a YouTube handle to test.');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);
    const res = await testChannelConnection(`@${cleanInput}`);
    setIsTestingConnection(false);

    if (!res.success || !res.channel) {
      setTestResult({
        tested: true,
        success: false,
        message: res.error || 'Connection failed: Channel not found on YouTube.',
      });
    } else {
      const liveStatusText = res.liveStream?.isLive
        ? `Currently LIVE: "${res.liveStream.title}" (Video ID: ${res.liveStream.videoId})`
        : 'Channel is currently OFFLINE (Detection working properly).';

      setTestResult({
        tested: true,
        success: true,
        message: `Successfully connected to "${res.channel.title}" (ID: ${res.channel.channelId})!`,
        liveInfo: liveStatusText,
      });
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Please enter your current password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Creator password updated successfully!', 'success');
  };

  // Nav items list in exact order
  const navItems: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'donations', label: 'Donations & History', icon: History },
    { id: 'youtube', label: 'YouTube Configuration', icon: Youtube },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'theme', label: 'Theme Settings', icon: Palette },
    { id: 'overlay', label: 'Stream Overlay', icon: Tv },
    { id: 'security', label: 'Account & Security', icon: Shield },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  const currentNavItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const CurrentNavIcon = currentNavItem.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header Bar with Left-Side Menu Button */}
      <header className="flex items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* Menu button at top-left corner */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-[var(--theme-primary)] hover:bg-slate-800 text-slate-200 hover:text-white transition-all shadow-md cursor-pointer group"
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform" />
            <span className="text-xs sm:text-sm font-bold">Menu</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-white tracking-tight">
              StreamerPay
            </span>
          </div>
        </div>

        {/* Current Active Category Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Active:</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 shadow-sm">
            <CurrentNavIcon className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>{currentNavItem.label}</span>
          </div>
        </div>
      </header>

      {/* Left-Side Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel: slides in smoothly from the left */}
          <div
            className="relative z-50 w-72 sm:w-80 max-w-[85vw] h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out animate-in slide-in-from-left"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard Navigation Drawer"
          >
            {/* Drawer Header with Close Button */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/20 border border-[var(--theme-primary)]/40 flex items-center justify-center text-[var(--theme-primary)] font-black text-xs">
                  SP
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">StreamerPay</h3>
                  <p className="text-[11px] text-slate-400">Creator Dashboard</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5" aria-label="Dashboard Navigation">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                const isLogout = item.id === 'logout';

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (isLogout) {
                        setShowLogoutConfirm(true);
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--theme-primary)] text-white shadow-lg'
                        : isLogout
                        ? 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>

                    {item.id === 'youtube' && !profile.isConfigured && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {item.id === 'theme' && isPreviewing && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                        Preview
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer with Quick Channel Info */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.channelName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-red-500 text-xs">
                    <Youtube className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-200 truncate">{profile.channelName || 'YouTube Creator'}</p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{profile.handle || '@channel'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Full width */}
      <main className="w-full pt-6 min-h-[500px]">
        {/* TAB A: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Creator Studio & Channel Info Card in Overview */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Creator Studio
                    </h1>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)]">
                      {themeConfig.name} Theme Active
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Livestream Super Chat & donation gateway management for creators.
                  </p>
                </div>

                {/* Currency information */}
                <div className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Currency</span>
                  <span className="text-xs font-extrabold text-emerald-400">INR (₹) Indian Rupee</span>
                </div>
              </div>

              {/* Connected YouTube Channel Information */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.channelName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-red-500">
                      <Youtube className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-base sm:text-lg text-white">
                        {profile.channelName || 'No YouTube Channel Connected'}
                      </h2>
                      {liveStream.isLive && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {profile.handle ? `${profile.handle}` : 'No YouTube handle configured'}
                      {profile.channelId && ` • Channel ID: ${profile.channelId}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActiveTab('youtube')}
                    className="text-xs font-semibold"
                  >
                    Configure Channel
                  </Button>
                </div>
              </div>
            </div>

            {/* Metrics Grid in INR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Total Revenue</span>
                  <span className="text-emerald-400 font-bold text-sm">INR ₹</span>
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>From {donations.length} Super Chats</span>
                </p>
              </div>

              {/* Total Superchats */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Total Superchats</span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white mt-2">{donations.length}</p>
                <p className="text-xs text-slate-400 mt-1">{topTierDonations} High Tier (Tier 5+)</p>
              </div>

              {/* Average Donation */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Average Donation</span>
                  <TrendingUp className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <p className="text-2xl font-black text-white mt-2">
                  {formatCurrency(averageDonation)}
                </p>
                <p className="text-xs text-slate-400 mt-1">Per transaction average</p>
              </div>

              {/* YouTube Live Status with 60s note */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                  <span>Live Status</span>
                  {liveStream.isLoading ? (
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : liveStream.error ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : liveStream.isLive ? (
                    <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                  ) : (
                    <Tv className="w-4 h-4 text-slate-500" />
                  )}
                </div>
                <div className="mt-2 min-h-[36px] flex flex-col justify-center">
                  {liveStream.isLoading ? (
                    <p className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Checking...</span>
                    </p>
                  ) : liveStream.error ? (
                    <div>
                      <p className="text-xl sm:text-2xl font-black text-rose-400">ERROR</p>
                      <p className="text-[11px] text-rose-300/80 truncate" title={liveStream.error}>
                        {liveStream.error}
                      </p>
                    </div>
                  ) : (
                    <p className={`text-2xl font-black ${liveStream.isLive ? 'text-red-500' : 'text-slate-300'}`}>
                      {liveStream.isLive ? 'ONLINE' : 'OFFLINE'}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800/60">
                  <span className="text-[11px] text-slate-500">Auto-refreshes every 60s</span>
                  <button
                    type="button"
                    onClick={() => refreshLiveStatus(true)}
                    disabled={liveStream.isLoading}
                    className="text-xs text-[var(--theme-primary)] hover:underline font-semibold cursor-pointer flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3 h-3 ${liveStream.isLoading ? 'animate-spin' : ''}`} />
                    <span>{liveStream.isLoading ? 'Checking' : 'Check'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Super Chat Activity Feed */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Recent Super Chat Activity</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('donations')}
                  className="text-xs text-[var(--theme-primary)] hover:underline"
                >
                  View All in History →
                </Button>
              </div>

              <div className="space-y-2.5">
                {donations.slice(0, 4).map((d) => {
                  const tier = getSuperChatTier(d.amount);
                  return (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: tier.headerBg }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{formatDonorName(d.supporterName)}</p>
                          <p className="text-xs text-slate-400 truncate max-w-md">
                            {d.message || 'Chat interaction'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-100">
                          {formatCurrency(d.amount)}
                        </span>
                        <p className="text-[11px] text-slate-500">{formatTimeAgo(d.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

          {/* TAB B: DONATIONS & HISTORY */}
          {activeTab === 'donations' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-bold text-white">Donations & History</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Search, filter, inspect, and export all stream donations in Indian Rupees (INR ₹).
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4 text-emerald-400" />}
                  onClick={exportDonationsCsv}
                  className="font-semibold"
                >
                  Export CSV ({donations.length})
                </Button>
              </div>

              {/* Filters & Sorting Control */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search supporter name or message..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftAddon={<Search className="w-4 h-4" />}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Sorting Control */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'latest' | 'amount' | 'name')}
                      className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                    >
                      <option value="latest">Latest</option>
                      <option value="amount">Amount</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Donations Table in INR: 5 exact columns in order */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950/90 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Name</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Message</th>
                      <th className="p-3.5">Time</th>
                      <th className="p-3.5 text-right">Action / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {sortedAndFilteredDonations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-500">
                          <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="font-semibold text-sm text-slate-400">No donation records found</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {searchQuery
                              ? 'Try adjusting your search query.'
                              : 'Incoming stream Super Chats will automatically appear here.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      sortedAndFilteredDonations.map((item) => {
                        const tier = getSuperChatTier(item.amount);
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            {/* 1. Name: 10 chars + '...' only if > 10 */}
                            <td className="p-3.5 font-bold text-slate-200">
                              <div
                                className="flex items-center gap-2 group cursor-pointer"
                                title={`Full Supporter Name: ${item.supporterName}`}
                                onClick={() => setSelectedDonationDetails(item)}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: tier.headerBg }}
                                />
                                <span className="font-mono text-xs sm:text-sm group-hover:text-emerald-400 transition-colors">
                                  {formatDonorName(item.supporterName)}
                                </span>
                              </div>
                            </td>

                            {/* 2. Amount: in INR (₹) */}
                            <td className="p-3.5 font-black text-white whitespace-nowrap">
                              {formatCurrency(item.amount)}
                            </td>

                            {/* 3. Message: Truncated to avoid layout breakage with full tooltip */}
                            <td className="p-3.5 text-slate-300 max-w-xs sm:max-w-md">
                              {item.message ? (
                                <p className="truncate text-xs sm:text-sm" title={item.message}>
                                  {item.message}
                                </p>
                              ) : (
                                <span className="italic text-slate-600 text-xs">No message</span>
                              )}
                            </td>

                            {/* 4. Time: Actual date and time */}
                            <td className="p-3.5 text-xs whitespace-nowrap">
                              <p className="font-semibold text-slate-200">
                                {new Date(item.timestamp).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(item.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })} ({formatTimeAgo(item.timestamp)})
                              </p>
                            </td>

                            {/* 5. Action / Status: Distinct status badges + inspect button */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2.5">
                                {item.status === 'completed' || (item.status as string) === 'successful' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Successful
                                  </span>
                                ) : item.status === 'pending' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                ) : item.status === 'failed' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <AlertTriangle className="w-3 h-3" />
                                    Failed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700 capitalize">
                                    {item.status}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedDonationDetails(item)}
                                  className="text-xs text-slate-300 hover:text-white"
                                >
                                  Inspect
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 
            ========================================================================
            TAB C: YOUTUBE CONFIGURATION
            ========================================================================
          */}
          {activeTab === 'youtube' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Youtube className="w-6 h-6 text-red-500" />
                  <h2 className="text-xl font-bold text-white">YouTube Configuration</h2>
                </div>
              </div>

              {/* Handle Configuration Form */}
              <form onSubmit={handleSaveChannel} className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Input
                    label="YouTube Channel Handle"
                    placeholder="e.g. MyGamingChannel or carryminati"
                    value={channelHandleInput}
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/^@+/, '');
                      setChannelHandleInput(cleanVal);
                      setChannelError(null);
                      setTestResult(null);
                    }}
                    helperText="Enter your channel handle. We automatically fetch your channel name, logo, and active stream."
                    error={channelError || undefined}
                    leftAddon={<span className="font-bold text-slate-400">@</span>}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingChannel || isDiscoveringChannel}
                    leftIcon={<Save className="w-4 h-4" />}
                    className="font-bold"
                  >
                    Save Channel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    isLoading={isTestingConnection}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Test Connection
                  </Button>
                </div>
              </form>

              {/* Test Connection diagnostic output */}
              {testResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1.5 animate-in fade-in duration-200 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.liveInfo && (
                    <p className="text-slate-300 text-xs pl-6">{testResult.liveInfo}</p>
                  )}
                </div>
              )}

              {/* Connected Official Channel Showcase */}
              {profile.isConfigured ? (
                <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Discovered Official Channel
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <img
                      src={profile.avatarUrl}
                      alt={profile.channelName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="font-extrabold text-base text-white">{profile.channelName}</p>
                      <p className="text-xs font-mono text-slate-400">{profile.handle}</p>
                      {profile.channelId && (
                        <p className="text-[11px] font-mono text-slate-500">ID: {profile.channelId}</p>
                      )}
                      <a
                        href={profile.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[var(--theme-primary)] hover:underline pt-1"
                      >
                        <span>View Channel on YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Current Live Stream Detection Status */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Live Stream Detection Status:
                      </span>
                      <button
                        type="button"
                        onClick={() => refreshLiveStatus(true)}
                        disabled={liveStream.isLoading}
                        className="text-xs text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-3 h-3 ${liveStream.isLoading ? 'animate-spin' : ''}`} />
                        <span>{liveStream.isLoading ? 'Checking live status...' : 'Refresh now'}</span>
                      </button>
                    </div>

                    {liveStream.isLoading ? (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                        <span>Checking YouTube channel live status...</span>
                      </div>
                    ) : liveStream.error ? (
                      <div className="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <div className="min-w-0">
                          <p className="font-bold text-rose-200">Live Status Check Failed</p>
                          <p className="text-[11px] text-rose-300/80 mt-0.5">{liveStream.error}</p>
                        </div>
                      </div>
                    ) : liveStream.isLive && liveStream.videoId ? (
                      <div className="mt-3 p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 flex items-center gap-3">
                        <img
                          src={liveStream.thumbnailUrl || `https://i.ytimg.com/vi/${liveStream.videoId}/hqdefault.jpg`}
                          alt="Live Stream"
                          className="w-24 h-14 rounded-lg object-cover border border-red-700 shrink-0"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-red-600 text-[9px] font-extrabold text-white uppercase tracking-wider">
                              ONLINE
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">Active live broadcast</span>
                          </div>
                          <p className="font-bold text-xs text-white truncate">{liveStream.title}</p>
                          <p className="text-[10px] font-mono text-slate-400">Video ID: {liveStream.videoId}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span>Currently OFFLINE • (Checks automatically every 60 seconds)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* 
            ========================================================================
            TAB D: PAYMENT
            ========================================================================
          */}
          {activeTab === 'payment' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">Payment</h2>
                <p className="text-xs text-slate-400 mt-1">
                  StreamerPay is configured exclusively for Indian Rupees (₹) with UPI, QR, and RuPay support.
                </p>
              </div>

              {/* Phase 1 note */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Phase 1 Frontend Sandbox
                </p>
                <p className="text-slate-300 text-xs">
                  Gateway verification and real banking webhooks (Razorpay/Cashfree/UPI merchant APIs) will be connected in Phase 2. The options below configure frontend availability for supporters.
                </p>
              </div>

              {/* Indian Payment Gateway Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  {
                    name: 'UPI / Instant QR',
                    sub: 'PhonePe, Google Pay, Paytm, BHIM transfer',
                    active: true,
                    fee: '0% Platform Fee',
                  },
                  {
                    name: 'RuPay / Debit & Credit Cards',
                    sub: 'Indian debit/credit cards with 3D Secure OTP',
                    active: true,
                    fee: 'Standard Banking Rate',
                  },
                  {
                    name: 'Net Banking (Indian Banks)',
                    sub: 'SBI, HDFC, ICICI, Axis, and 50+ banks',
                    active: true,
                    fee: '0% Platform Fee',
                  },
                  {
                    name: 'Google Pay for India',
                    sub: '1-tap UPI intent and mobile checkout',
                    active: true,
                    fee: '0% Platform Fee',
                  },
                ].map((gw, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{gw.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{gw.sub}</p>
                      <span className="inline-block mt-2 text-[11px] font-mono text-emerald-400">
                        {gw.fee}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shrink-0">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB E: THEME SETTINGS (FIVE THEMES) */}
          {activeTab === 'theme' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[var(--theme-primary)]" />
                    <h2 className="text-xl font-bold text-white">Website Themes</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Select from 5 streamer color themes. Preview temporarily or apply permanently across the platform.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetPreview}
                    disabled={!isPreviewing}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Reset Preview
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      applyTheme();
                      showToast(`Applied ${themeConfig.name} theme!`, 'success');
                    }}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Apply Theme
                  </Button>
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    Committed Theme: <strong>{THEMES[savedTheme]?.name}</strong>
                    {isPreviewing && (
                      <span className="text-amber-300 ml-2">
                        (Currently previewing: {themeConfig.name})
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">Saved in browser storage</span>
              </div>

              {/* 5 Themes Selection Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                  const t = THEMES[id];
                  const isCurrentSaved = savedTheme === id;
                  const isCurrentActive = activeTheme === id;

                  return (
                    <div
                      key={id}
                      onClick={() => setPreview(id)}
                      className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 select-none ${
                        isCurrentActive
                          ? 'border-[var(--theme-primary)] bg-slate-800/80 shadow-xl ring-2 ring-[var(--theme-primary)]/40 scale-[1.01]'
                          : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-base">{t.name}</span>
                          {isCurrentSaved ? (
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Active
                            </span>
                          ) : isCurrentActive ? (
                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Previewing
                            </span>
                          ) : null}
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">{t.tagline}</p>
                      </div>

                      {/* Swatch color preview bar */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 h-7 rounded-lg overflow-hidden p-1 bg-black/40 border border-white/10">
                          {t.previewColors.map((hex, i) => (
                            <div
                              key={i}
                              className="h-full flex-1 rounded-md"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="font-mono text-slate-400">{t.primaryColor}</span>
                          <span
                            className={`font-semibold ${
                              isCurrentActive ? 'text-[var(--theme-primary)]' : 'text-slate-500'
                            }`}
                          >
                            {isCurrentActive ? 'Selected' : 'Click to preview'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB F: STREAM OVERLAY */}
          {activeTab === 'overlay' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-[var(--theme-primary)]" />
                    <h2 className="text-xl font-bold text-white">OBS Studio Browser Source Overlay</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Add this transparent overlay directly into OBS, Streamlabs, or vMix for real-time Super Chats in INR.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopyOverlayUrl}
                  >
                    Copy Overlay URL
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                    onClick={() => triggerTestAlert()}
                  >
                    Test Alert (₹)
                  </Button>
                </div>
              </div>

              {/* OBS URL Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  OBS Browser Source URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={overlayUrl}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 select-all"
                  />
                  <Button variant="secondary" size="sm" onClick={handleCopyOverlayUrl}>
                    Copy
                  </Button>
                </div>
              </div>

              {/* Overlay Configuration Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-white">
                    <span>Alert Display Duration</span>
                    <span className="text-[var(--theme-primary)] font-bold">
                      {overlayConfig.alertDurationSec} seconds
                    </span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="15"
                    step="1"
                    value={overlayConfig.alertDurationSec}
                    onChange={(e) =>
                      updateOverlayConfig({ alertDurationSec: Number(e.target.value) })
                    }
                    className="w-full accent-[var(--theme-primary)] cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white text-sm">Play Super Chat Audio Chime</p>
                    <p className="text-xs text-slate-400">
                      Triumphant synthesizer audio on donation alert
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateOverlayConfig({ playAlertSound: !overlayConfig.playAlertSound })
                    }
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      overlayConfig.playAlertSound
                        ? 'bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    {overlayConfig.playAlertSound ? (
                      <Volume2 className="w-5 h-5 text-[var(--theme-primary)]" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}



          {/* TAB H: SECURITY / ACCOUNT */}
          {activeTab === 'security' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-slate-800">
                <h2 className="text-xl font-bold text-white">Creator Security & Credentials</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage login password, two-factor authentication, and active creator sessions.
                </p>
              </div>

              {/* Password update form */}
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <Button type="submit" variant="primary" leftIcon={<Lock className="w-4 h-4" />}>
                  Update Password
                </Button>
              </form>

              {/* 2FA Toggle */}
              <div className="pt-6 border-t border-slate-800 max-w-xl">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white text-sm flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[var(--theme-primary)]" />
                      Two-Factor Authentication (2FA)
                    </p>
                    <p className="text-xs text-slate-400">
                      Protect creator dashboard with an authenticator app (TOTP).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked);
                      showToast(
                        e.target.checked
                          ? '2FA simulation enabled for creator account'
                          : '2FA disabled',
                        'info'
                      );
                    }}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-[var(--theme-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </main>

      {/* Donation Detail Modal (when clicking Inspect in Tab B) */}
      {selectedDonationDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-base">Super Chat Details (INR)</h4>
              <button
                onClick={() => setSelectedDonationDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Render authentic Super Chat card in INR */}
            {(() => {
              const tier = getSuperChatTier(selectedDonationDetails.amount);
              return (
                <div className="rounded-2xl overflow-hidden shadow-xl">
                  <div
                    className="px-4 py-3 flex items-center justify-between text-white"
                    style={{ backgroundColor: tier.headerBg }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-black/25 flex items-center justify-center font-bold text-xs border border-white/20">
                        {selectedDonationDetails.supporterName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-tight">
                          {selectedDonationDetails.supporterName}
                        </p>
                        <p className="text-[11px] opacity-90">
                          {formatPinDuration(tier.pinDurationMinutes)}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-base">
                      {formatCurrency(selectedDonationDetails.amount)}
                    </span>
                  </div>
                  {selectedDonationDetails.message && (
                    <div
                      className="p-4 text-xs sm:text-sm text-white font-medium"
                      style={{ backgroundColor: tier.contentBg }}
                    >
                      {selectedDonationDetails.message}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Record ID</span>
                <span className="font-mono text-slate-200">{selectedDonationDetails.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method</span>
                <span className="text-slate-200">{selectedDonationDetails.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status</span>
                <span className="text-emerald-400 font-bold uppercase">Completed</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedDonationDetails(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  triggerTestAlert(selectedDonationDetails);
                  setSelectedDonationDetails(null);
                }}
              >
                Replay Alert
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">Sign Out of Creator Studio?</h4>
              <p className="text-xs text-slate-400">
                You will be returned to the public donation page.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1 font-bold"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logoutAdmin();
                  onNavigatePublic();
                }}
              >
                Log Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
