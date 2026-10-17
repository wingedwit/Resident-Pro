(function attachResidentStateManager(globalScope) {
    const createStateStore = ({ config, storageUtils, dateUtils }) => {
        const { STORAGE_KEY, MAX_UNDO_HISTORY, createInitialState } = config;
        const { safeStorage, loadStateFromStorage } = storageUtils;
        const { todayISO } = dateUtils;

        const getInitialState = () => createInitialState(todayISO());

        let state = loadStateFromStorage(STORAGE_KEY, getInitialState);
        let undoStack = [JSON.stringify(state)];
        let redoStack = [];
        let saveStateTimeout = null;
        const listeners = new Set();

        const getHistoryMeta = () => ({
            canUndo: undoStack.length > 1,
            canRedo: redoStack.length > 0
        });

        const notify = () => {
            const historyMeta = getHistoryMeta();
            listeners.forEach((listener) => {
                try {
                    listener(state, historyMeta);
                } catch (error) {
                    console.error('State listener error:', error);
                }
            });
        };

        const saveState = (immediate = false) => {
            const performSave = () => {
                safeStorage.set(STORAGE_KEY, JSON.stringify(state));
                if (saveStateTimeout) {
                    clearTimeout(saveStateTimeout);
                    saveStateTimeout = null;
                }
            };

            if (immediate) {
                performSave();
            } else {
                if (saveStateTimeout) clearTimeout(saveStateTimeout);
                saveStateTimeout = setTimeout(performSave, 250);
            }
        };

        const applyInvariants = (currentState, nextState) => {
            const result = { ...nextState };

            if (result.type === 'Practical') {
                result.presenter = '';
            }

            // Sync Presenter Attendance
            const oldPresenter = currentState.presenter;
            const newPresenter = result.presenter;
            if (oldPresenter !== newPresenter) {
                let residentsPresent = Array.isArray(result.residentsPresent) ? [...result.residentsPresent] : [];
                if (oldPresenter) {
                    residentsPresent = residentsPresent.filter((name) => name !== oldPresenter);
                }
                if (newPresenter && !residentsPresent.includes(newPresenter)) {
                    residentsPresent.push(newPresenter);
                }
                result.residentsPresent = residentsPresent;
            }

            return result;
        };

        const flushPendingSave = () => {
            if (!saveStateTimeout) return;
            clearTimeout(saveStateTimeout);
            saveStateTimeout = null;
            safeStorage.set(STORAGE_KEY, JSON.stringify(state));
        };

        const isStateEqual = (a, b) => {
            if (a === b) return true;
            if (!a || !b) return false;
            if (
                a.date !== b.date ||
                a.topic !== b.topic ||
                a.type !== b.type ||
                a.presenter !== b.presenter ||
                a.seniorResident !== b.seniorResident ||
                a.moderator !== b.moderator
            ) {
                return false;
            }
            const arrA = Array.isArray(a.residentsPresent) ? a.residentsPresent : [];
            const arrB = Array.isArray(b.residentsPresent) ? b.residentsPresent : [];
            if (arrA.length !== arrB.length) return false;
            for (let i = 0; i < arrA.length; i++) {
                if (arrA[i] !== arrB[i]) return false;
            }
            return true;
        };

        const getState = () => state;

        const setState = (patch) => {
            const nextState = applyInvariants(state, { ...state, ...patch });
            if (isStateEqual(nextState, state)) return;

            state = nextState;
            undoStack.push(JSON.stringify(state));
            if (undoStack.length > MAX_UNDO_HISTORY) {
                undoStack.shift();
            }
            redoStack = [];
            saveState();
            notify();
        };

        const undo = () => {
            if (undoStack.length <= 1) return;
            redoStack.push(undoStack.pop());
            const previousState = JSON.parse(undoStack[undoStack.length - 1]);
            state = previousState;
            saveState(true);
            notify();
        };

        const redo = () => {
            if (redoStack.length === 0) return;
            const nextState = JSON.parse(redoStack.pop());
            undoStack.push(JSON.stringify(nextState));
            state = nextState;
            saveState(true);
            notify();
        };

        const reset = () => {
            state = getInitialState();
            undoStack = [JSON.stringify(state)];
            redoStack = [];
            saveState(true);
            notify();
        };

        const loadWithoutRecording = (nextState, persist = true) => {
            state = nextState;
            if (persist) saveState(true);
            notify();
        };

        const subscribe = (listener, immediate = false) => {
            listeners.add(listener);
            if (immediate) {
                listener(state, getHistoryMeta());
            }
            return () => listeners.delete(listener);
        };

        return {
            getState,
            setState,
            undo,
            redo,
            reset,
            loadWithoutRecording,
            subscribe,
            flushPendingSave,
            getHistoryMeta
        };
    };

    globalScope.ResidentStateManager = {
        createStateStore
    };
})(window);
