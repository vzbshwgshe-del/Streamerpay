import React, { useEffect, useState } from 'react';
import { useStream } from '../../context/StreamContext';
import { formatCurrency } from '../../lib/utils';
import { formatPinDuration } from '../../lib/donation-rules';
import { Button } from '../ui/button';
import { Tv, Sparkles, Pin, Play, Volume2, ArrowLeft } from 'lucide-react';

interface OverlayPageProps {
  onBackToDashboard?: () => void;
  isStandalone?: boolean;
}

export const OverlayPage: React.FC<OverlayPageProps> = ({
  onBackToDashboard,
  isStandalone = false,
}) => {
  const {
    activeOverlayAlert,
    dismissOverlayAlert,
    overlayConfig,
    triggerTestAlert,
  } = useStream();

  const [progress, setProgress] = useState<number>(100);

  // Animated countdown bar
  useEffect(() => {
    if (!activeOverlayAlert) {
      setProgress(100);
      return;
    }

    const duration = overlayConfig.alertDurationSec * 1000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeOverlayAlert, overlayConfig.alertDurationSec]);

  return (
    <div className="relative min-h-screen w-full bg-transparent overflow-hidden font-sans select-none">
      {/* Top Test Banner for Creator testing (transparent in actual OBS unless hovered) */}
      {onBackToDashboard && (
        <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded-2xl shadow-xl backdrop-blur-md opacity-80 hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={onBackToDashboard}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => triggerTestAlert()}
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            Trigger Test Alert
          </Button>
          <span className="text-[11px] font-mono text-slate-400 pr-2 hidden sm:inline">
            OBS Browser Source: 1920x1080 Transparent
          </span>
        </div>
      )}

      {/* Main Overlay Alert Container */}
      <div className="fixed top-8 right-8 z-40 max-w-md w-full">
        {activeOverlayAlert ? (
          <div className="animate-in slide-in-from-top-6 duration-300 transform transition-all">
            {/* Authentic YouTube Super Chat Banner */}
            <div
              className="rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20"
              style={{
                boxShadow: `0 20px 40px -10px ${activeOverlayAlert.tierConfig.headerBg}80`,
              }}
            >
              {/* Header */}
              <div
                className="px-5 py-4 flex items-center justify-between gap-4 text-white"
                style={{ backgroundColor: activeOverlayAlert.tierConfig.headerBg }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center font-black text-lg border border-white/30 shrink-0">
                    {activeOverlayAlert.supporterName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-base truncate leading-tight">
                      {activeOverlayAlert.supporterName}
                    </p>
                    <p className="text-xs font-semibold opacity-90 flex items-center gap-1.5 mt-0.5">
                      <Pin className="w-3.5 h-3.5 text-amber-300" />
                      <span>
                        {formatPinDuration(activeOverlayAlert.tierConfig.pinDurationMinutes)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-2xl tracking-tight">
                    {formatCurrency(activeOverlayAlert.amount, activeOverlayAlert.currency)}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              {activeOverlayAlert.message && (
                <div
                  className="px-5 py-4 text-sm font-semibold text-white leading-relaxed break-words"
                  style={{ backgroundColor: activeOverlayAlert.tierConfig.contentBg }}
                >
                  <p>{activeOverlayAlert.message}</p>
                </div>
              )}

              {/* Timer Progress Bar */}
              <div
                className="h-1.5 bg-black/40 w-full overflow-hidden"
                style={{ backgroundColor: `${activeOverlayAlert.tierConfig.contentBg}CC` }}
              >
                <div
                  className="h-full bg-white/70 transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : !isStandalone ? (
          <div className="hidden sm:block opacity-40 text-right pr-4 pt-12 text-xs font-mono text-slate-500">
            [Stream Overlay Ready • Waiting for Super Chat]
          </div>
        ) : null}
      </div>
    </div>
  );
};
