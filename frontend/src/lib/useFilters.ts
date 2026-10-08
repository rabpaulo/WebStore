import { useCallback, useEffect, useState } from 'react';
export function useFilters(initial: Record<string, string> = {}) {
  const [filters, setFilters] = useState<Record<string, string>>({ search: '', ...initial });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.search), 250);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);
  return { filters, page, setPage, setFilter, params: { ...filters, search, page, limit: 12 } };
}
