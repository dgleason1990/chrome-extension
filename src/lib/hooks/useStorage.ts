import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for Chrome storage access
 * This hook provides a getter and setter function for Chrome storage.local
 * with automatic state management in the React component.
 * 
 * @param key - The key to store and retrieve data
 * @param initialValue - Optional initial value if nothing is in storage
 * @returns A tuple containing the value and setter function
 */
export function useStorage<T>(key: string, initialValue: T): [T, (value: T) => Promise<void>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load initial value from storage
  useEffect(() => {
    chrome.storage.local.get([key], (result) => {
      // If the key exists in storage, use that value, otherwise use the initial value
      if (result[key] !== undefined) {
        setStoredValue(result[key]);
      }
    });
  }, [key]);

  // Set a new value in storage
  const setValue = useCallback(async (value: T): Promise<void> => {
    // Update the React state
    setStoredValue(value);
    
    // Update Chrome storage
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }, [key]);

  return [storedValue, setValue];
} 