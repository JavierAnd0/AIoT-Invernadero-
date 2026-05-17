import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const { autoFetch = true, initialData = null } = options;
  const [data,    setData]    = useState(initialData);
  const [loading, setLoading] = useState(autoFetch);
  const [error,   setError]   = useState(null);

  // Always keep a ref to the latest fetchFn so execute never needs it as a dep
  const fetchRef = useRef(fetchFn);
  useEffect(() => { fetchRef.current = fetchFn; });

  // execute is intentionally stable (empty deps); it reads fetchRef at call time
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Spread deps directly so React compares individual values, not the array object
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (autoFetch) execute(); }, [autoFetch, ...deps]);

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
