"use client";

/**
 * Local Storage Cache Utility
 * Provides offline fallback for all data fetching operations
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const STORAGE_PREFIX = "disaster_monitor_cache_";
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours default

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get cached data from local storage
 */
export function getCached<T>(key: string): T | null {
  if (!isBrowser()) return null;

  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired
    if (now - entry.timestamp > entry.ttl) {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`[StorageCache] Error reading cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set data in local storage cache
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  if (!isBrowser()) return;

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error(`[StorageCache] Error writing cache for ${key}:`, error);
    // If storage is full, try to clear old entries
    try {
      clearExpiredCache();
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (retryError) {
      console.error(`[StorageCache] Failed to cache after cleanup:`, retryError);
    }
  }
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  if (!isBrowser()) return;

  const now = Date.now();
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<unknown> = JSON.parse(cached);
          if (now - entry.timestamp > entry.ttl) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Invalid entry, remove it
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Clear all cached data
 */
export function clearAllCache(): void {
  if (!isBrowser()) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

/**
 * Fetch with offline fallback
 * Tries to fetch fresh data, falls back to cache if network fails
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    fallbackToCache?: boolean;
  } = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, fallbackToCache = true } = options;

  // Try to fetch fresh data
  try {
    const data = await fetchFn();
    // Cache the fresh data
    setCache(key, data, ttl);
    return data;
  } catch (error) {
    console.warn(`[StorageCache] Network fetch failed for ${key}, trying cache...`, error);

    // If network fails and fallback is enabled, try cache
    if (fallbackToCache) {
      const cached = getCached<T>(key);
      if (cached !== null) {
        console.log(`[StorageCache] Using cached data for ${key}`);
        return cached;
      }
    }

    // If no cache available, throw the original error
    throw error;
  }
}

/**
 * Get cache info (for debugging)
 */
export function getCacheInfo(): {
  totalEntries: number;
  totalSize: number;
  entries: Array<{ key: string; age: number; size: number }>;
} {
  if (!isBrowser()) {
    return { totalEntries: 0, totalSize: 0, entries: [] };
  }

  const entries: Array<{ key: string; age: number; size: number }> = [];
  let totalSize = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<unknown> = JSON.parse(cached);
          const size = new Blob([cached]).size;
          totalSize += size;
          entries.push({
            key: key.replace(STORAGE_PREFIX, ""),
            age: Date.now() - entry.timestamp,
            size,
          });
        }
      } catch {
        // Skip invalid entries
      }
    }
  }

  return {
    totalEntries: entries.length,
    totalSize,
    entries: entries.sort((a, b) => b.age - a.age),
  };
}

