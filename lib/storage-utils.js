(function attachStorageUtils(globalScope) {
    const safeStorage = {
        get(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                return false;
            }
        }
    };

    const normalizeStatePayload = (savedPayload, getInitialState) => {
        if (!savedPayload || typeof savedPayload !== 'object') return getInitialState();
        const merged = { ...getInitialState(), ...(savedPayload || {}) };
        if (merged.type === 'Practical') {
            merged.presenter = '';
        }
        return merged;
    };

    const loadStateFromStorage = (storageKey, getInitialState) => {
        const saved = safeStorage.get(storageKey);
        if (!saved) return getInitialState();
        try {
            const parsed = JSON.parse(saved);
            return normalizeStatePayload(parsed, getInitialState);
        } catch (e) {
            return getInitialState();
        }
    };

    globalScope.ResidentStorageUtils = {
        safeStorage,
        normalizeStatePayload,
        loadStateFromStorage
    };
})(window);
