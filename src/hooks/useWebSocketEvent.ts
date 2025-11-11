import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Hook to subscribe to a WebSocket event
 * @param event - The event name to listen for
 * @param handler - The handler function to call when the event is received
 * @param deps - Optional dependency array (similar to useEffect)
 * 
 * @example
 * ```tsx
 * useWebSocketEvent('membership-status-changed', (data) => {
 *   console.log('Membership status changed:', data);
 *   // Update UI or state
 * });
 * ```
 */
export function useWebSocketEvent<T = any>(
  event: string,
  handler: (data: T) => void,
  deps?: React.DependencyList
) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, handler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, subscribe, ...(deps || [])]);
}

