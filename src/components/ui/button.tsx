import React from 'react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'theme';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const { themeConfig } = useTheme();

    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0e14]';

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
      md: 'text-sm px-4 py-2.5 gap-2 min-h-[40px]',
      lg: 'text-base px-6 py-3 gap-2.5 min-h-[48px] font-semibold',
      icon: 'p-2 min-h-[38px] min-w-[38px] aspect-square',
    };

    let variantClasses = '';
    switch (variant) {
      case 'primary':
      case 'theme':
        variantClasses = `${themeConfig.buttonClass} active:scale-[0.98]`;
        break;
      case 'secondary':
        variantClasses =
          'bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 border border-slate-700/60 hover:border-slate-600/80 shadow-sm active:scale-[0.98]';
        break;
      case 'outline':
        variantClasses =
          'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-500 active:scale-[0.98]';
        break;
      case 'ghost':
        variantClasses = 'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white active:scale-[0.98]';
        break;
      case 'danger':
        variantClasses =
          'bg-rose-600/90 hover:bg-rose-500 text-white shadow-rose-900/30 shadow-sm active:scale-[0.98]';
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseClasses, sizeClasses[size], variantClasses, className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin -ml-0.5 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
