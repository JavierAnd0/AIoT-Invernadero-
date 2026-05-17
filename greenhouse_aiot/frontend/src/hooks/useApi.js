import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const { autoFetch = true, initialData = null } = options;
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error,   setError]   = useState(null);

  // Track mount state to avoid setState after unmount
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Always hold latest fetchFn in a ref so execute is never stale
  const fetchRef = useRef(fetchFn);
  useEffect(() => { fetchRef.current = fetchFn; });

  const execute = useCallback(async (...args) => {
    if (mounted.current) { setLoading(true); setError(null); }
    try {
      const result = await fetchRef.current(...args);
      if (mounted.current) setData(result);
      return result;
    } catch (err) {
      if (mounted.current)
        setError(err.response?.data?.error || 'Request failed');
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoFetch) execute(); }, [autoFetch, ...deps]);

  return { data, loading, error, refetch: execute };
}

export function usePolling(fetchFn, intervalMs = 30_000, deps = []) {
  const result = useApi(fetchFn, deps);

  useEffect(() => {
    let id;

    const tick = () => {
      if (!document.hidden) result.refetch();
    };

    const schedule = () => {
      clearInterval(id);
      id = setInterval(tick, intervalMs);
    };

    // When the tab becomes visible again, fetch immediately then restart interval
    const onVisibilityChange = () => {
      if (!document.hidden) {
        result.refetch();
        schedule();
      } else {
        clearInterval(id);
      }
    };

    schedule();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [result.refetch, intervalMs]);

  return result;
}
