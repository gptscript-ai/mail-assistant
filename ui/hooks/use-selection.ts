import * as React from 'react';

export interface Selection<T = string> {
    deselectAll: () => void;
    deselectOne: (key: T) => void;
    selectAll: () => void;
    selectOne: (key: T) => void;
    selected: Set<T>;
    selectedAny: boolean;
    selectedAll: boolean;
}

// IMPORTANT: To prevent infinite loop, `keys` argument must be memoized with React.useMemo hook.
export function useSelection<T = string>(
    keys: T[] = [],
    selected: Set<T>,
    setSelected: any,
    currentPage: number,
    pagePerRows: number
): Selection<T> {
    const getCurrentPageKeys = React.useCallback(() => {
        const start = currentPage * pagePerRows;
        const end = Math.min(start + pagePerRows, keys.length);
        return keys.slice(start, end);
    }, [keys, currentPage, pagePerRows]);

    const handleDeselectAll = React.useCallback(() => {
        const currentKeys = getCurrentPageKeys();
        setSelected((prev: Set<T>) => {
            const copy = new Set(prev);
            currentKeys.forEach((key) => copy.delete(key));
            return copy;
        });
    }, [getCurrentPageKeys]);

    const handleDeselectOne = React.useCallback((key: T) => {
        setSelected((prev: Iterable<unknown> | null | undefined) => {
            const copy = new Set(prev);
            copy.delete(key);
            return copy;
        });
    }, []);

    const handleSelectAll = React.useCallback(() => {
        const currentKeys = getCurrentPageKeys();
        setSelected((prev: Set<T>) => {
            const copy = new Set(prev);
            currentKeys.forEach((key) => copy.add(key));
            return copy;
        });
    }, [getCurrentPageKeys]);

    const handleSelectOne = React.useCallback((key: T) => {
        setSelected((prev: Set<T>) => {
            const copy = new Set(prev);
            copy.add(key);
            return copy;
        });
    }, []);

    const selectedAny = selected.size > 0;
    const selectedAll = getCurrentPageKeys().every((key) => selected.has(key));

    return {
        deselectAll: handleDeselectAll,
        deselectOne: handleDeselectOne,
        selectAll: handleSelectAll,
        selectOne: handleSelectOne,
        selected,
        selectedAny,
        selectedAll,
    };
}
