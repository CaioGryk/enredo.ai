import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple tailwind classes and merges conflicting ones.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
