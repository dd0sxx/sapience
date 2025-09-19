'use client';

import { cn } from '~/lib/utils/util';

interface YesNoSplitButtonProps {
  onYes: () => void;
  onNo: () => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  // When true, visually mark the corresponding side as selected
  selectedYes?: boolean;
  selectedNo?: boolean;
}

/**
 * Combined two-sided pill for Yes / No actions.
 * Subtle green (Yes) and red (No) tints with a shared border and divider.
 */
export default function YesNoSplitButton({
  onYes,
  onNo,
  className,
  disabled,
  size = 'lg',
  selectedYes,
  selectedNo,
}: YesNoSplitButtonProps) {
  const sizeClasses =
    size === 'sm'
      ? 'h-8 text-sm'
      : size === 'md'
        ? 'h-10 text-sm'
        : 'h-11 md:h-10 text-base';

  const common = cn(
    'flex-1 px-4 font-medium transition-all duration-200 ease-in-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none',
    sizeClasses
  );

  return (
    <div className={cn('flex w-full gap-3', className)}>
      <button
        type="button"
        onClick={onYes}
        disabled={disabled}
        className={cn(
          common,
          selectedYes
            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/25 hover:bg-emerald-500/30 border-emerald-400/80 hover:border-emerald-500/60'
            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/50 hover:border-emerald-500/60',
          'border rounded-md'
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={onNo}
        disabled={disabled}
        className={cn(
          common,
          selectedNo
            ? 'text-rose-600 dark:text-rose-400 bg-rose-500/25 hover:bg-rose-500/30 border-rose-400/80 hover:border-rose-500/50'
            : 'text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/50 hover:border-rose-500/50',
          'border rounded-md'
        )}
      >
        No
      </button>
    </div>
  );
}
