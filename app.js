const requiredResidentModules = [
    'ResidentDateUtils',
    'ResidentStorageUtils',
    'ResidentLogic',
    'ResidentConfig',
    'ResidentUIUtils',
    'ResidentReportUI',
    'ResidentModalManager',
    'ResidentStateManager',
    'ResidentDatePicker',
    'ResidentPickerModal',
    'ResidentModal',
    'ResidentShortcuts'
];

requiredResidentModules.forEach((moduleName) => {
    if (!window[moduleName]) {
        throw new Error(`Resident Pro dependency missing: ${moduleName}. Check index.html script order.`);
    }
});

const trackEvent = (eventName, params = {}) => {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params);
};

// System color scheme listener
if (window.matchMedia && typeof applySystemTheme === 'function') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applySystemTheme(mediaQuery.matches);
    const handleThemeChange = (event) => applySystemTheme(event.matches);
    if (typeof mediaQuery.addEventListener === 'function') mediaQuery.addEventListener('change', handleThemeChange);
    else if (typeof mediaQuery.addListener === 'function') mediaQuery.addListener(handleThemeChange);
}

// Global module APIs
const { createToast, copyText, createCopyFeedback } = window.ResidentUIUtils;
const { createReportRenderer } = window.ResidentReportUI;
const { createStateStore } = window.ResidentStateManager;
const { createDatePickerController } = window.ResidentDatePicker;
const { createPickerModalController } = window.ResidentPickerModal;
const { createResidentModalController } = window.ResidentModal;
const { initKeyboardShortcuts } = window.ResidentShortcuts;

const {
    RESIDENT_GROUPS,
    MODERATOR_OPTIONS,
    SENIOR_OPTIONS,
    TYPE_OPTIONS,
    PRESENTER_OPTIONS,
    ALL_RESIDENTS,
    getSelectedResidents,
    getAttendanceStats,
    getAttendanceSummaryLabel,
    getReportRows,
    buildGoogleDocPayload,
    buildGoogleDocText,
    buildGoogleDocHtml,
    escapeHtml
} = window.ResidentLogic;

// DOM references
const fields = {
    date: document.getElementById('dateInput'),
    topic: document.getElementById('topicInput')
};

const liveReport = document.getElementById('liveReport');
const copyDocButton = document.getElementById('copyDocButton');
const copyDocIcon = document.getElementById('copyDocIcon');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const mobileCopyButton = document.getElementById('mobileCopyButton');
const upiCopyButton = document.getElementById('upiCopyButton');
const clearButton = document.getElementById('clearButton');
const toast = document.getElementById('toast');

const residentAttendanceButton = document.getElementById('residentAttendanceButton');
const residentAttendanceCount = document.getElementById('residentAttendanceCount');
const residentModalEl = document.getElementById('residentModal');
const residentModalClose = document.getElementById('residentModalClose');
const residentSearchInput = document.getElementById('residentSearchInput');
const residentSearchClear = document.getElementById('residentSearchClear');
const residentEmptySearch = document.getElementById('residentEmptySearch');
const residentChecklist = document.getElementById('residentChecklist');
const residentClearButton = document.getElementById('residentClearButton');
const residentDoneButton = document.getElementById('residentDoneButton');
const residentModeToggle = document.getElementById('residentModeToggle');

const typePickerButton = document.getElementById('typePickerButton');
const presenterPickerButton = document.getElementById('presenterPickerButton');
const seniorPickerButton = document.getElementById('seniorPickerButton');
const moderatorPickerButton = document.getElementById('moderatorPickerButton');
const typePickerValue = document.getElementById('typePickerValue');
const presenterPickerValue = document.getElementById('presenterPickerValue');
const seniorPickerValue = document.getElementById('seniorPickerValue');
const moderatorPickerValue = document.getElementById('moderatorPickerValue');

const pickerModalEl = document.getElementById('pickerModal');
const pickerModalTitle = document.getElementById('pickerModalTitle');
const pickerSearchInput = document.getElementById('pickerSearchInput');
const pickerSearchClear = document.getElementById('pickerSearchClear');
const pickerEmptySearch = document.getElementById('pickerEmptySearch');
const pickerChecklist = document.getElementById('pickerChecklist');
const pickerModalClose = document.getElementById('pickerModalClose');
const pickerClearButton = document.getElementById('pickerClearButton');
const pickerDoneButton = document.getElementById('pickerDoneButton');

const datePillButtons = Array.from(document.querySelectorAll('[data-date-offset]'));
const attendanceGroupPillButtons = Array.from(document.querySelectorAll('[data-attendance-group]'));

// Initialize State Store
const store = createStateStore({
    config: window.ResidentConfig,
    storageUtils: window.ResidentStorageUtils,
    dateUtils: window.ResidentDateUtils
});

// UI Feedback
const showToast = createToast(toast);
const triggerCopySuccess = createCopyFeedback(copyDocButton, copyDocIcon);

const TOPIC_DEBOUNCE_DELAY = 150;
let topicDebounceTimer = null;

const cancelPendingTopicCommit = () => {
    if (!topicDebounceTimer) return;
    clearTimeout(topicDebounceTimer);
    topicDebounceTimer = null;
};

const flushPendingTopicCommit = () => {
    if (!topicDebounceTimer) return;
    clearTimeout(topicDebounceTimer);
    topicDebounceTimer = null;
    if (fields.topic) {
        store.setState({ topic: fields.topic.value });
    }
};

const copyGDocData = async (trigger = 'button') => {
    flushPendingTopicCommit();
    const currentState = store.getState();
    try {
        const payload = typeof buildGoogleDocPayload === 'function'
            ? buildGoogleDocPayload(currentState)
            : { text: buildGoogleDocText(currentState), html: buildGoogleDocHtml(currentState) };
        await copyText(payload.text, payload.html);
        showToast('Copied G-Doc data');
        triggerCopySuccess();
        trackEvent('copy_gdoc_data', { trigger });
    } catch (_) {
        showToast('Copy failed');
    }
};

// Date Picker
const datePicker = createDatePickerController({
    dateInput: fields.date,
    datePillButtons,
    dateUtils: window.ResidentDateUtils,
    onDateChange: (dateStr) => store.setState({ date: dateStr }),
    getCurrentDate: () => store.getState().date
});
datePicker.init();

// Modal Controllers
const getTrackedModals = () => [residentModalEl, pickerModalEl];

const pickerModal = createPickerModalController({
    elements: {
        modal: pickerModalEl,
        title: pickerModalTitle,
        searchInput: pickerSearchInput,
        searchClear: pickerSearchClear,
        emptySearch: pickerEmptySearch,
        checklist: pickerChecklist,
        closeButton: pickerModalClose,
        clearButton: pickerClearButton,
        doneButton: pickerDoneButton
    },
    modalManager: window.ResidentModalManager,
    escapeHtml,
    onSelect: (key, value) => store.setState({ [key]: value }),
    onClear: (key) => store.setState({ [key]: '' }),
    getTrackedModals
});
pickerModal.init();

const residentModal = createResidentModalController({
    elements: {
        modal: residentModalEl,
        triggerButton: residentAttendanceButton,
        searchInput: residentSearchInput,
        searchClear: residentSearchClear,
        emptySearch: residentEmptySearch,
        checklist: residentChecklist,
        closeButton: residentModalClose,
        clearButton: residentClearButton,
        doneButton: residentDoneButton,
        modeToggle: residentModeToggle
    },
    modalManager: window.ResidentModalManager,
    residentLogic: window.ResidentLogic,
    onSelectionChange: (selected, options) => store.setState({ residentsPresent: selected }, options),
    getTrackedModals,
    getActivePresenter: () => {
        const current = store.getState();
        return current.type === 'Practical' ? '' : (current.presenter || '');
    }
});
residentModal.init(() => store.getState().residentsPresent);

// Quick Batch Attendance Pill Toggles
attendanceGroupPillButtons.forEach((pillBtn) => {
    pillBtn.addEventListener('click', () => {
        const targetGroup = pillBtn.dataset.attendanceGroup;
        const currentPresent = getSelectedResidents(store.getState());
        const presentSet = new Set(currentPresent);

        if (targetGroup === 'ALL') {
            const allSelected = ALL_RESIDENTS.length > 0 && presentSet.size === ALL_RESIDENTS.length;
            store.setState({ residentsPresent: allSelected ? [] : [...ALL_RESIDENTS] });
            return;
        }

        const groupDef = RESIDENT_GROUPS.find((g) => g.level === targetGroup);
        if (!groupDef) return;
        const allGroupPresent = groupDef.names.every((name) => presentSet.has(name));
        groupDef.names.forEach((name) => {
            if (allGroupPresent) presentSet.delete(name);
            else presentSet.add(name);
        });
        store.setState({ residentsPresent: Array.from(presentSet) });
    });
});

// Picker Button Triggers
typePickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Type',
        stateKey: 'type',
        options: TYPE_OPTIONS,
        returnButton: typePickerButton
    }, store.getState().type);
    requestAnimationFrame(syncActiveReportCard);
});

presenterPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Presenter',
        stateKey: 'presenter',
        options: PRESENTER_OPTIONS,
        groups: RESIDENT_GROUPS,
        returnButton: presenterPickerButton
    }, store.getState().presenter);
    requestAnimationFrame(syncActiveReportCard);
});

seniorPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Senior Resident',
        stateKey: 'seniorResident',
        options: SENIOR_OPTIONS,
        returnButton: seniorPickerButton
    }, store.getState().seniorResident);
    requestAnimationFrame(syncActiveReportCard);
});

moderatorPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Moderator',
        stateKey: 'moderator',
        options: MODERATOR_OPTIONS,
        returnButton: moderatorPickerButton
    }, store.getState().moderator);
    requestAnimationFrame(syncActiveReportCard);
});

// Form Inputs & Two-Way Field-to-Report Flow
const sessionForm = document.getElementById('sessionForm');
const orderedFormControls = [
    fields.date,
    fields.topic,
    typePickerButton,
    presenterPickerButton,
    seniorPickerButton,
    moderatorPickerButton,
    residentAttendanceButton
].filter(Boolean);

const controlToCardSlug = new Map([
    [fields.date, 'date'],
    [fields.topic, 'topic'],
    [typePickerButton, 'type'],
    [presenterPickerButton, 'presenter'],
    [seniorPickerButton, 'senior-resident'],
    [moderatorPickerButton, 'moderator'],
    [residentAttendanceButton, 'resident-present']
]);

const cardSlugToControl = new Map([
    ['date', fields.date],
    ['topic', fields.topic],
    ['type', typePickerButton],
    ['presenter', presenterPickerButton],
    ['senior-resident', seniorPickerButton],
    ['moderator', moderatorPickerButton],
    ['resident-present', residentAttendanceButton]
]);

const fieldContainerBySlug = new Map();
cardSlugToControl.forEach((control, slug) => {
    const fieldContainer = control?.closest('.field');
    if (fieldContainer) fieldContainerBySlug.set(slug, fieldContainer);
});

let hoveredCardSlug = '';
let lastLinkedSlug = '';

const syncLinkedFormField = (activeSlug = '') => {
    const normalized = activeSlug || '';
    if (lastLinkedSlug === normalized) return;
    if (lastLinkedSlug) {
        fieldContainerBySlug.get(lastLinkedSlug)?.classList.remove('is-linked-field');
    }
    if (normalized) {
        fieldContainerBySlug.get(normalized)?.classList.add('is-linked-field');
    }
    lastLinkedSlug = normalized;
};

const activateFormControlBySlug = (slug, _card, preferredMode = '') => {
    const control = cardSlugToControl.get(slug);
    if (!control || control.disabled) return;

    const fieldContainer = fieldContainerBySlug.get(slug) || control;
    if (typeof fieldContainer.scrollIntoView === 'function') {
        fieldContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (slug === 'date') {
        fields.date?.focus();
        datePicker.open();
        requestAnimationFrame(syncActiveReportCard);
        return;
    }

    if (slug === 'topic') {
        fields.topic.focus();
        fields.topic.select();
        requestAnimationFrame(syncActiveReportCard);
        return;
    }

    if (slug === 'resident-present') {
        control.focus();
        const mode = preferredMode === 'absent' ? 'absent' : 'present';
        residentModal.open(store.getState().residentsPresent, mode);
        requestAnimationFrame(syncActiveReportCard);
        return;
    }

    control.focus();
    control.click();
    requestAnimationFrame(syncActiveReportCard);
};

// Report Renderer
const reportRenderer = createReportRenderer({
    liveReport,
    getReportRows,
    getAttendanceStats,
    escapeHtml,
    onCardActivate: activateFormControlBySlug
});

const resolveActiveCardSlug = () => {
    const expandedTrigger = orderedFormControls.find((el) => el.getAttribute('aria-expanded') === 'true');
    if (expandedTrigger) return controlToCardSlug.get(expandedTrigger) || '';
    if (typeof datePicker.isOpen === 'function' && datePicker.isOpen()) return 'date';
    const activeEl = document.activeElement;
    if (activeEl) {
        if (controlToCardSlug.has(activeEl)) return controlToCardSlug.get(activeEl) || '';
        if (activeEl.closest('.date-field') || activeEl.closest('.gcal-popover')) return 'date';
        if (activeEl.closest('.attendance-field')) return 'resident-present';
        const focusedCard = activeEl.closest?.('.report-card[data-card-slug]');
        if (focusedCard && !focusedCard.classList.contains('is-disabled-card')) {
            return focusedCard.dataset.cardSlug || '';
        }
    }
    return hoveredCardSlug || '';
};

const syncActiveReportCard = () => {
    const activeSlug = resolveActiveCardSlug();
    if (typeof reportRenderer.setActiveCard === 'function') {
        reportRenderer.setActiveCard(activeSlug);
    }
    syncLinkedFormField(activeSlug);
};

sessionForm?.addEventListener('submit', (event) => {
    event.preventDefault();
});

document.addEventListener('focusin', () => {
    requestAnimationFrame(syncActiveReportCard);
});

document.addEventListener('focusout', () => {
    requestAnimationFrame(syncActiveReportCard);
});

liveReport?.addEventListener('pointerover', (event) => {
    const card = event.target.closest('.report-card[data-card-slug]');
    const nextSlug = card && !card.classList.contains('is-disabled-card') ? (card.dataset.cardSlug || '') : '';
    if (hoveredCardSlug === nextSlug) return;
    hoveredCardSlug = nextSlug;
    syncActiveReportCard();
});

liveReport?.addEventListener('pointerleave', () => {
    if (!hoveredCardSlug) return;
    hoveredCardSlug = '';
    syncActiveReportCard();
});

sessionForm?.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const target = event.target;
    if (!target) return;

    const enabledControls = orderedFormControls.filter((el) => !el.disabled && el.offsetParent !== null);
    const currentIndex = enabledControls.indexOf(target);
    if (currentIndex === -1) return;

    if (event.key === 'Enter' && target.tagName === 'INPUT' && target.id !== 'dateInput') {
        event.preventDefault();
        const nextControl = enabledControls[currentIndex + 1];
        if (nextControl) nextControl.focus();
        return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextControl = enabledControls[currentIndex + delta];
        if (nextControl) {
            nextControl.focus();
            if (nextControl === fields.topic) fields.topic.select();
        }
    }
});

fields.topic.addEventListener('input', () => {
    const nextValue = fields.topic.value;
    cancelPendingTopicCommit();
    topicDebounceTimer = setTimeout(() => {
        topicDebounceTimer = null;
        store.setState({ topic: nextValue });
    }, TOPIC_DEBOUNCE_DELAY);
});
fields.topic.addEventListener('change', () => {
    cancelPendingTopicCommit();
    store.setState({ topic: fields.topic.value });
});
fields.topic.addEventListener('blur', () => {
    flushPendingTopicCommit();
});

// Action Buttons
copyDocButton.addEventListener('click', () => copyGDocData('button'));

clearButton.addEventListener('click', () => {
    cancelPendingTopicCommit();
    store.reset();
    showToast('Form cleared');
});

undoButton?.addEventListener('click', () => {
    cancelPendingTopicCommit();
    store.undo();
});
redoButton?.addEventListener('click', () => {
    cancelPendingTopicCommit();
    store.redo();
});

mobileCopyButton?.addEventListener('click', async () => {
    try {
        await copyText('+919468937372');
        showToast('Copied Mobile Number');
    } catch (_) {}
});

upiCopyButton?.addEventListener('click', async () => {
    try {
        await copyText('vaibhav.ganesh51@okaxis');
        showToast('Copied UPI ID');
    } catch (_) {}
});

// Keyboard Shortcuts
initKeyboardShortcuts({
    onEscape: () => {
        if (typeof datePicker.handleEscape === 'function' && datePicker.handleEscape()) return true;
        if (pickerModal.handleEscape()) return true;
        if (residentModal.handleEscape()) return true;
        return false;
    },
    onTopicJump: () => {
        datePicker.close?.();
        fields.topic.focus();
        fields.topic.select();
    },
    onCopyDoc: () => copyGDocData('shortcut'),
    onClear: () => {
        datePicker.close?.();
        clearButton.click();
    },
    onUndo: () => undoButton?.click(),
    onRedo: () => redoButton?.click()
});

let isInitialSync = true;
const attendanceLabelEl = residentAttendanceButton?.querySelector('span');

const setPickerLabel = (el, nextText) => {
    if (!el || el.textContent === nextText) return;
    el.textContent = nextText;
    if (!isInitialSync && nextText) {
        el.classList.remove('value-fade-in');
        void el.offsetWidth;
        el.classList.add('value-fade-in');
    }
};

// Synchronize UI with State
const syncUI = (state, { canUndo, canRedo }, source) => {
    if (source === 'undo' || source === 'redo' || source === 'reset') {
        residentModal.resetUndoSession?.();
    }

    if (fields.topic.value !== (state.topic || '')) {
        fields.topic.value = state.topic || '';
    }
    datePicker.setDate(state.date);

    setPickerLabel(typePickerValue, state.type || '');
    typePickerButton.classList.toggle('empty-picker', !state.type);

    const isPractical = state.type === 'Practical';
    presenterPickerButton.disabled = isPractical;
    if (isPractical) {
        setPickerLabel(presenterPickerValue, '');
        presenterPickerButton.classList.remove('empty-picker');
        presenterPickerButton.classList.add('disabled-picker');
    } else {
        setPickerLabel(presenterPickerValue, state.presenter || '');
        presenterPickerButton.classList.remove('disabled-picker');
        presenterPickerButton.classList.toggle('empty-picker', !state.presenter);
    }

    setPickerLabel(seniorPickerValue, state.seniorResident || '');
    seniorPickerButton.classList.toggle('empty-picker', !state.seniorResident);

    setPickerLabel(moderatorPickerValue, state.moderator || '');
    moderatorPickerButton.classList.toggle('empty-picker', !state.moderator);

    const attendanceStats = getAttendanceStats(state);
    const selectedCount = attendanceStats.presentCount;
    if (residentAttendanceCount.textContent !== String(selectedCount)) {
        residentAttendanceCount.textContent = String(selectedCount);
        if (!isInitialSync) {
            residentAttendanceCount.classList.remove('count-pop');
            void residentAttendanceCount.offsetWidth;
            residentAttendanceCount.classList.add('count-pop');
        }
    }
    if (attendanceLabelEl) {
        const nextAttendanceText = typeof getAttendanceSummaryLabel === 'function'
            ? getAttendanceSummaryLabel(state)
            : (selectedCount ? `${selectedCount} resident${selectedCount === 1 ? '' : 's'} selected` : '');
        setPickerLabel(attendanceLabelEl, nextAttendanceText);
    }
    residentAttendanceButton.classList.toggle('empty-picker', selectedCount === 0);

    // Sync quick batch attendance pills
    const groupStatsByLevel = new Map(attendanceStats.groups.map((g) => [g.level, g]));
    attendanceGroupPillButtons.forEach((pillBtn) => {
        const targetGroup = pillBtn.dataset.attendanceGroup;
        if (targetGroup === 'ALL') {
            const isAll = attendanceStats.total > 0 && attendanceStats.presentCount === attendanceStats.total;
            const isPartial = attendanceStats.presentCount > 0 && !isAll;
            pillBtn.classList.toggle('active', isAll);
            pillBtn.classList.toggle('partial', isPartial);
            pillBtn.setAttribute('aria-pressed', isAll ? 'true' : 'false');
            return;
        }
        const gStat = groupStatsByLevel.get(targetGroup);
        const isGroupAll = Boolean(gStat && gStat.total > 0 && gStat.presentCount === gStat.total);
        const isGroupPartial = Boolean(gStat && gStat.presentCount > 0 && !isGroupAll);
        pillBtn.classList.toggle('active', isGroupAll);
        pillBtn.classList.toggle('partial', isGroupPartial);
        pillBtn.setAttribute('aria-pressed', isGroupAll ? 'true' : 'false');
    });

    if (residentModal.isOpen()) {
        residentModal.syncCheckboxes(state.residentsPresent);
    }

    reportRenderer.render(state);

    if (undoButton) undoButton.disabled = !canUndo;
    if (redoButton) redoButton.disabled = !canRedo;
    isInitialSync = false;
};

// Initial store subscription triggers initial render
store.subscribe(syncUI, true);

// Lifecycle save flushes
const flushAll = () => {
    flushPendingTopicCommit();
    if (typeof store.flushPendingSave === 'function') {
        store.flushPendingSave();
    }
};

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
});
window.addEventListener('pagehide', flushAll);
