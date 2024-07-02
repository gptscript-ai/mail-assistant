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
    setSelected: any
): Selection<T> {
    const handleDeselectAll = React.useCallback(() => {
        setSelected(new Set());
    }, []);

    const handleDeselectOne = React.useCallback((key: T) => {
        setSelected((prev: Iterable<unknown> | null | undefined) => {
            const copy = new Set(prev);
            copy.delete(key);
            return copy;
        });
    }, []);

    const handleSelectAll = React.useCallback(() => {
        setSelected(new Set(keys));
    }, [keys]);

    const handleSelectOne = React.useCallback((key: T) => {
        setSelected((prev: Set<T>) => {
            const copy = new Set(prev);
            copy.add(key);
            return copy;
        });
    }, []);

    const selectedAny = selected.size > 0;
    const selectedAll = selected.size === keys.length;

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
