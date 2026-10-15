(function attachResidentModalManager(globalScope) {
    const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = (container) => Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
    );

    const trapFocusInModal = (modal, event) => {
        if (event.key !== 'Tab') return;
        const focusable = getFocusableElements(modal);
        if (focusable.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === first || !modal.contains(document.activeElement)) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last || !modal.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            }
        }
    };

    const isModalOpen = (modal) => Boolean(modal && !modal.classList.contains('hidden') && !modal.classList.contains('is-closing'));

    const updateBodyScrollLock = (modals = []) => {
        const isAnyOpen = modals.some(isModalOpen);
        document.body.classList.toggle('modal-open', isAnyOpen);
    };

    const closeModalWithAnimation = (modal, onComplete, getTrackedModals) => {
        if (!modal || modal.classList.contains('hidden') || modal.classList.contains('is-closing')) return;
        modal.classList.add('is-closing');
        setTimeout(() => {
            modal.classList.remove('is-closing');
            modal.classList.add('hidden');
            if (typeof getTrackedModals === 'function') {
                updateBodyScrollLock(getTrackedModals());
            } else if (Array.isArray(getTrackedModals)) {
                updateBodyScrollLock(getTrackedModals);
            }
            if (typeof onComplete === 'function') {
                onComplete();
            }
        }, 180);
    };

    globalScope.ResidentModalManager = {
        getFocusableElements,
        trapFocusInModal,
        isModalOpen,
        updateBodyScrollLock,
        closeModalWithAnimation
    };
})(window);
