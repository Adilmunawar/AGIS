'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value. This is useful for delaying a computation
 * or API call until the user has stopped typing for a certain period.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes before the delay has passed.
    // This prevents the debounced value from being updated prematurely.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run the effect if the value or delay changes

  return debouncedValue;
}
