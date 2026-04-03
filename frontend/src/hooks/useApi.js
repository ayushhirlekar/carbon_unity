import { useState, useCallback } from 'react';

export function useApi(apiFunction) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiFunction(...args);
        setData(response.data ?? response);
        return response;
      } catch (err) {
        const errorMsg = err?.message || 'Something went wrong';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, execute, reset };
}
