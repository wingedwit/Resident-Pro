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

        // Never restore residents that are no longer part of the current roster.
        // This prevents removed residents from reappearing through browser localStorage.
        const currentResidents = Array.isArray(globalScope.ResidentLogic?.ALL_RESIDENTS)
            ? globalScope.ResidentLogic.ALL_RESIDENTS
            : [];

        if (merged.type === 'Practical') {
            merged.presenter = '';
        }

        if (currentResidents.length > 0) {
            if (typeof merged.presenter === 'string' && !currentResidents.includes(merged.presenter)) {
                merged.presenter = '';
            }

            const rawPresent = Array.isArray(merged.residentsPresent) ? merged.residentsPresent : [];
            const presentSet = new Set(rawPresent.filter((name) => currentResidents.includes(name)));
            merged.residentsPresent = currentResidents.filter((name) => presentSet.has(name));
        } else if (!Array.isArray(merged.residentsPresent)) {
            merged.residentsPresent = [];
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
