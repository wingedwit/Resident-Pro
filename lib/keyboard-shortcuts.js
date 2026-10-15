(function attachResidentShortcuts(globalScope) {
    const initKeyboardShortcuts = ({
        onEscape,
        onTopicJump,
        onCopyDoc,
        onClear,
        onUndo,
        onRedo
    }) => {
        const handler = (event) => {
            if (event.key === 'Escape') {
                if (typeof onEscape === 'function' && onEscape()) {
                    return;
                }
            }

            // Alt+T — jump to Topic input
            if (event.altKey && (event.key === 't' || event.key === 'T')) {
                event.preventDefault();
                if (typeof onTopicJump === 'function') onTopicJump();
                return;
            }

            // Ctrl+Alt+D or Ctrl+Alt+C — Copy GDoc
            const isDocShortcut = event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey &&
                (event.code === 'KeyD' || event.key === 'd' || event.key === 'D' || event.code === 'KeyC' || event.key === 'c' || event.key === 'C');

            if (isDocShortcut) {
                event.preventDefault();
                if (typeof onCopyDoc === 'function') onCopyDoc();
                return;
            }

            // Ctrl+Backspace — Reset
            if (event.ctrlKey && event.key === 'Backspace') {
                event.preventDefault();
                if (typeof onClear === 'function') onClear();
                return;
            }

            // Ctrl+Z — Undo
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'z' || event.key === 'Z')) {
                event.preventDefault();
                if (typeof onUndo === 'function') onUndo();
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z — Redo
            if (
                ((event.ctrlKey || event.metaKey) && (event.key === 'y' || event.key === 'Y')) ||
                ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'z' || event.key === 'Z'))
            ) {
                event.preventDefault();
                if (typeof onRedo === 'function') onRedo();
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    };

    globalScope.ResidentShortcuts = {
        initKeyboardShortcuts
    };
})(window);
