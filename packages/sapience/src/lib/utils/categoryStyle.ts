'use client';

import { FOCUS_AREAS } from '~/lib/constants/focusAreas';

const DEFAULT_CATEGORY_COLOR = '#71717a';
const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#C084FC', // purple-400
  '#4ADE80', // green-400
  '#FBBF24', // amber-400
  '#F87171', // red-400
  '#22D3EE', // cyan-400
  '#FB923C', // orange-400
];

export const getCategoryStyle = (categorySlug?: string | null) => {
  const slug = categorySlug || '';
  const focusArea = FOCUS_AREAS.find((fa) => fa.id === slug);
  if (focusArea) {
    return { color: focusArea.color, id: focusArea.id, name: focusArea.name };
  }
  if (!slug) return { color: DEFAULT_CATEGORY_COLOR, id: '', name: '' };
  // Deterministic fallback color based on slug
  const hashCode = slug.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + (acc * 32 - acc);
  }, 0);
  const colorIndex = Math.abs(hashCode) % DEFAULT_COLORS.length;
  return {
    color: DEFAULT_COLORS[colorIndex] || DEFAULT_CATEGORY_COLOR,
    id: slug,
    name: '',
  };
};
