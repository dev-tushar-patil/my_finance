import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `fn` whenever `deps` change; ignores stale responses.
 * Returns { data, loading, error, reload, setData }.
 */
export default function useAsync(fn, deps = [], { initial = null, enabled = true } = {}) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const callId = useRef(0);

  const run = useCallback(async () => {
    const id = ++callId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      if (id === callId.current) setData(res);
      return res;
    } catch (e) {
      if (id === callId.current) setError(e);
      return null;
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (enabled) run(); }, [run, enabled]);

  return { data, loading, error, reload: run, setData };
}
