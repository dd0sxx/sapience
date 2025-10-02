import { FOCUS_AREAS, type FocusArea } from '~/lib/constants/focusAreas';

/**
 * Get color for a category slug based on focus areas or deterministic fallback
 * This ensures consistent colors across the application
 */
export const getCategoryColor = (categorySlug: string): string => {
  // First try to find a matching focus area
  const focusArea = FOCUS_AREAS.find((fa) => fa.id === categorySlug);

  if (focusArea) {
    return focusArea.color;
  }

  // If no matching focus area, create a deterministic color based on the slug
  // This ensures the same category always gets the same color
  const DEFAULT_COLORS = [
    '#3B82F6', // blue-500
    '#C084FC', // purple-400
    '#4ADE80', // green-400
    '#FBBF24', // amber-400
    '#F87171', // red-400
    '#22D3EE', // cyan-400
    '#FB923C', // orange-400
  ];

  // Use a simple hash function to get a consistent index
  const hashCode = categorySlug.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + (acc * 32 - acc);
  }, 0);

  const colorIndex = Math.abs(hashCode) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[colorIndex];
};

/**
 * Get complete category style information including color, name, and icon
 * This provides a unified interface for category styling across the app
 */
export const getCategoryStyle = (
  categorySlug: string
): FocusArea | undefined => {
  // First try to find a matching focus area
  const focusArea = FOCUS_AREAS.find((fa) => fa.id === categorySlug);

  if (focusArea) {
    return focusArea;
  }

  // If no matching focus area, create a partial focus area with color
  const color = getCategoryColor(categorySlug);
  return {
    id: categorySlug,
    name: '', // Will use category.name from database
    resources: [],
    color,
    iconSvg: '', // Will use default TagIcon
  };
};

/**
 * Get category display name, falling back to slug if name is not available
 */
export const getCategoryDisplayName = (
  categorySlug: string,
  categoryName?: string
): string => {
  const style = getCategoryStyle(categorySlug);
  return style?.name || categoryName || categorySlug;
};

/**
 * Check if a category is a known focus area
 */
export const isKnownFocusArea = (categorySlug: string): boolean => {
  return FOCUS_AREAS.some((fa) => fa.id === categorySlug);
};
