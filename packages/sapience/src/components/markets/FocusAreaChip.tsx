import * as React from 'react';
import { motion } from 'framer-motion';

interface FocusAreaChipProps {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
  iconSvg?: string;
  IconComponent?: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  className?: string;
  iconSize?: 'sm' | 'md';
}

const CHIP_BASE =
  'group relative shrink-0 inline-flex text-left rounded-full items-center gap-1.5 transition-all duration-200 ease-out text-xs whitespace-nowrap px-2.5 py-1 md:py-0';

const FocusAreaChip: React.FC<FocusAreaChipProps> = ({
  label,
  color,
  selected,
  onClick,
  iconSvg,
  IconComponent,
  className,
  iconSize = 'md',
}) => {
  const labelRef = React.useRef<HTMLSpanElement>(null);
  const [, setLabelWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = labelRef.current;
    if (!el) return;

    const updateWidth = () => {
      setLabelWidth(el.offsetWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [label, iconSize]);
  // Desktop behavior: when unselected, show icon-only circular chip; when selected, show icon + text pill
  const selectedStyles = selected
    ? {
        className: `${CHIP_BASE} bg-[var(--chip-bg-strong)] border border-transparent ring-1 ring-[var(--chip-ring)]`,
        style: {
          ['--chip-bg-strong' as any]: `${color}33`,
          ['--chip-ring' as any]: `${color}66`,
        } as React.CSSProperties,
      }
    : {
        className: `${CHIP_BASE} bg-[var(--chip-bg)] border border-transparent`,
        style: {
          ['--chip-bg' as any]: `${color}1A`,
        } as React.CSSProperties,
      };

  const mergedClassName = className
    ? `${selectedStyles.className} ${className}`
    : selectedStyles.className;
  const desktopResponsiveClassName = 'md:h-6 md:px-0 md:gap-0 md:justify-start';
  const desktopTransitionClassName = 'md:transition-none';

  const iconDimensionClass = iconSize === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <motion.button
      // Only animate position changes; width is controlled by inner label container
      type="button"
      onClick={onClick}
      className={`${mergedClassName} ${desktopResponsiveClassName} ${desktopTransitionClassName}`}
      style={{ ...selectedStyles.style, minWidth: '1.5rem' }}
      aria-pressed={selected}
      aria-label={label}
      title={label}
    >
      <span className="inline-flex items-center justify-center md:w-6 md:h-6">
        {iconSvg ? (
          <span
            className={`${iconDimensionClass} inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}
            aria-hidden="true"
            style={{ color }}
            dangerouslySetInnerHTML={{ __html: iconSvg }}
          />
        ) : (
          IconComponent && (
            <span
              className={`${iconDimensionClass} inline-flex items-center justify-center`}
              aria-hidden="true"
            >
              <IconComponent className={iconDimensionClass} style={{ color }} />
            </span>
          )
        )}
      </span>
      {/* Mobile label (always visible on mobile to preserve existing behavior) */}
      <span className="ml-1 font-medium pr-1 md:hidden">{label}</span>

      {/* Desktop label: measured container animates width; inner text fades */}
      <motion.span
        key="desktop-label-container"
        className="hidden md:inline-block overflow-hidden"
        layout
        animate={{ width: selected ? 'auto' : 0 }}
        initial={false}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <motion.span
          ref={labelRef}
          className="pl-1 font-medium pr-2.5 text-foreground/80 inline-block"
          initial={false}
          animate={{ opacity: selected ? 1 : 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {label}
        </motion.span>
      </motion.span>

      {/* Desktop hover overlay: preview selected state and overlap neighbors */}
      {!selected && (
        <motion.span
          key="hover-overlay"
          className="hidden md:inline-flex items-center justify-start absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0.5 h-6 rounded-full z-20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out pointer-events-none group-hover:pointer-events-auto"
        >
          <span
            className="absolute inset-0 rounded-full bg-background z-0"
            aria-hidden="true"
          />
          <span
            className="relative z-10 inline-flex items-center h-6 rounded-full pl-1.5 pr-1.5 bg-[var(--chip-bg-strong)] ring-1 ring-[var(--chip-ring)] border border-transparent text-foreground/80"
            style={
              {
                ['--chip-bg-strong' as any]: `${color}33`,
                ['--chip-ring' as any]: `${color}66`,
              } as React.CSSProperties
            }
          >
            {iconSvg ? (
              <span
                className={`${iconDimensionClass} inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:block`}
                aria-hidden="true"
                style={{ color }}
                dangerouslySetInnerHTML={{ __html: iconSvg }}
              />
            ) : (
              IconComponent && (
                <span
                  className={`${iconDimensionClass} inline-flex items-center justify-center`}
                  aria-hidden="true"
                >
                  <IconComponent
                    className={iconDimensionClass}
                    style={{ color }}
                  />
                </span>
              )
            )}
            <span className="ml-2 font-medium pr-1">{label}</span>
          </span>
        </motion.span>
      )}
    </motion.button>
  );
};

export default FocusAreaChip;
