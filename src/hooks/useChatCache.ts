import { useCallback } from "react";
import type { ChatMessage } from "../features/club/types/chat";

const CACHE_PREFIX = "club-chat-";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedMessages {
  messages: ChatMessage[];
  timestamp: number;
  clubId: string;
}

/**
 * Hook for caching chat messages in localStorage
 */
export function useChatCache() {
  const getCacheKey = useCallback((clubId: string): string => {
    return `${CACHE_PREFIX}${clubId}`;
  }, []);

  const getCachedMessages = useCallback(
    (clubId: string): ChatMessage[] | null => {
      try {
        const cacheKey = getCacheKey(clubId);
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const data: CachedMessages = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is expired
        if (now - data.timestamp > CACHE_TTL) {
          localStorage.removeItem(cacheKey);
          return null;
        }

        // Check if cache is for the same club
        if (data.clubId !== clubId) {
          localStorage.removeItem(cacheKey);
          return null;
        }

        // Convert date strings back to Date objects
        return data.messages.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
          updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : undefined,
          deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined,
        }));
      } catch (error) {
        console.error("Error reading chat cache:", error);
        return null;
      }
    },
    [getCacheKey]
  );

  const setCachedMessages = useCallback(
    (clubId: string, messages: ChatMessage[]): void => {
      try {
        const cacheKey = getCacheKey(clubId);
        const data: CachedMessages = {
          messages,
          timestamp: Date.now(),
          clubId,
        };
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (error) {
        console.error("Error writing chat cache:", error);
        // If quota exceeded, try to clear old caches
        try {
          clearOldCaches();
          localStorage.setItem(getCacheKey(clubId), JSON.stringify({
            messages,
            timestamp: Date.now(),
            clubId,
          }));
        } catch (retryError) {
          console.error("Error retrying cache write:", retryError);
        }
      }
    },
    [getCacheKey]
  );

  const clearCache = useCallback(
    (clubId: string): void => {
      try {
        const cacheKey = getCacheKey(clubId);
        localStorage.removeItem(cacheKey);
      } catch (error) {
        console.error("Error clearing chat cache:", error);
      }
    },
    [getCacheKey]
  );

  const clearAllCaches = useCallback((): void => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error clearing all chat caches:", error);
    }
  }, []);

  return {
    getCachedMessages,
    setCachedMessages,
    clearCache,
    clearAllCaches,
  };
}

/**
 * Clear old caches that are expired
 */
function clearOldCaches(): void {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    keys.forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const data: CachedMessages = JSON.parse(cached);
            if (now - data.timestamp > CACHE_TTL) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // If we can't parse it, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error("Error clearing old caches:", error);
  }
}

