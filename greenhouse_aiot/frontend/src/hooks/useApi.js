import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const { autoFetch = true, initialData = null } = options;
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error,   setError]   = useState(null);
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(async (...args) => {
    setLoading(true); setError(null);
    try {
      const result = await fetchRef.current(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [deps]); // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (autoFetch) execute(); }, [autoFetch, execute]);

  return { data, loading, error, refetch: execute };
}

export function usePolling(fetchFn, intervalMs = 30000, deps = []) {
  const result = useApi(fetchFn, deps);
  useEffect(() => {
    const id = setInterval(result.refetch, intervalMs);
    return () => clearInterval(id);
  }, [result.refetch, intervalMs]);
  return result;
}
