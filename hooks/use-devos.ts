'use client';

import { useState, useCallback } from 'react';

/**
 * Hook to manage DevOS sessions and creation
 */
export function useDevosSessions() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devos/sessions');
      const data = await res.json();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { sessions, loading, refreshSessions };
}

/**
 * Hook for cognitive session details and real-time state
 */
export function useDevosSession(id: string) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/devos/sessions/${id}`);
      const data = await res.json();
      setSession(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  return { session, loading, refresh };
}

/**
 * Controls the DevOS Execution Engine loop and logic
 */
export function useRunDevosCycle() {
  const [running, setRunning] = useState(false);

  const runCycle = useCallback(async (sessionId: string, strategy: string = 'safe') => {
    setRunning(true);
    try {
      const res = await fetch('/api/devos/engine/run-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, strategy })
      });
      return await res.json();
    } finally {
      setRunning(false);
    }
  }, []);

  const runLoop = useCallback(async (sessionId: string, strategy: string = 'safe') => {
    setRunning(true);
    try {
      const res = await fetch('/api/devos/engine/run-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, strategy })
      });
      return await res.json();
    } finally {
      setRunning(false);
    }
  }, []);

  return { runCycle, runLoop, running };
}
