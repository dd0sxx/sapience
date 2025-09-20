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
  // Optional sublabels to render beneath the primary labels
  yesOddsText?: string;
  noOddsText?: string;
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
  yesOddsText,
  noOddsText,
}: YesNoSplitButtonProps) {
  const hasOdds = Boolean(yesOddsText || noOddsText);
  const sizeClasses =
    size === 'sm'
      ? 'h-8 text-sm'
      : size === 'md'
        ? 'h-10 text-sm'
        : 'h-11 md:h-10 text-base';

  const common = cn(
    'flex-1 px-4 font-medium transition-all duration-200 ease-in-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none rounded-md border',
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
            ? 'text-emerald-900 dark:text-emerald-50 bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]'
            : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/60'
        )}
      >
        {hasOdds ? (
          <span className="flex flex-col items-center justify-center translate-y-[1px]">
            <span className="leading-none">Yes</span>
            {yesOddsText ? (
              <span className="text-[8px] leading-none text-emerald-900/80 dark:text-emerald-100/80 mt-0.5">
                {yesOddsText}
              </span>
            ) : null}
          </span>
        ) : (
          'Yes'
        )}
      </button>
      <button
        type="button"
        onClick={onNo}
        disabled={disabled}
        className={cn(
          common,
          selectedNo
            ? 'text-rose-900 dark:text-rose-50 bg-rose-500/30 hover:bg-rose-500/40 border-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.25)]'
            : 'text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-400/60'
        )}
      >
        {hasOdds ? (
          <span className="flex flex-col items-center justify-center translate-y-[1px]">
            <span className="leading-none">No</span>
            {noOddsText ? (
              <span className="text-[8px] leading-none text-rose-900/80 dark:text-rose-100/80 mt-0.5">
                {noOddsText}
              </span>
            ) : null}
          </span>
        ) : (
          'No'
        )}
      </button>
    </div>
  );
}
