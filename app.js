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
    getSelectedResidents,
    getReportRows,
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
const residentSelectAll = document.getElementById('residentSelectAll');

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

// Initialize State Store
const store = createStateStore({
    config: window.ResidentConfig,
    storageUtils: window.ResidentStorageUtils,
    dateUtils: window.ResidentDateUtils
});

// UI Feedback
const showToast = createToast(toast);
const triggerCopySuccess = createCopyFeedback(copyDocButton, copyDocIcon);

const copyGDocData = async (trigger = 'button') => {
    const currentState = store.getState();
    try {
        await copyText(buildGoogleDocText(currentState), buildGoogleDocHtml(currentState));
        showToast('Copied G-Doc data');
        triggerCopySuccess();
        trackEvent('copy_gdoc_data', { trigger });
    } catch (_) {
        showToast('Copy failed');
    }
};

// Report Renderer
const reportRenderer = createReportRenderer({ liveReport, getReportRows, escapeHtml });

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
        selectAllCheckbox: residentSelectAll
    },
    modalManager: window.ResidentModalManager,
    residentLogic: window.ResidentLogic,
    onSelectionChange: (selected) => store.setState({ residentsPresent: selected }),
    getTrackedModals
});
residentModal.init(() => store.getState().residentsPresent);

// Picker Button Triggers
typePickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Type',
        stateKey: 'type',
        options: TYPE_OPTIONS,
        returnButton: typePickerButton
    }, store.getState().type);
});

presenterPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Presenter',
        stateKey: 'presenter',
        options: PRESENTER_OPTIONS,
        groups: RESIDENT_GROUPS,
        returnButton: presenterPickerButton
    }, store.getState().presenter);
});

seniorPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Senior Resident',
        stateKey: 'seniorResident',
        options: SENIOR_OPTIONS,
        returnButton: seniorPickerButton
    }, store.getState().seniorResident);
});

moderatorPickerButton.addEventListener('click', () => {
    pickerModal.open({
        title: 'Select Moderator',
        stateKey: 'moderator',
        options: MODERATOR_OPTIONS,
        returnButton: moderatorPickerButton
    }, store.getState().moderator);
});

// Form Inputs
fields.topic.addEventListener('input', () => store.setState({ topic: fields.topic.value }));
fields.topic.addEventListener('change', () => store.setState({ topic: fields.topic.value }));

fields.date.addEventListener('input', () => store.setState({ date: fields.date.value }));
fields.date.addEventListener('change', () => store.setState({ date: fields.date.value }));

// Action Buttons
copyDocButton.addEventListener('click', () => copyGDocData('button'));

clearButton.addEventListener('click', () => {
    store.reset();
    showToast('Form cleared');
});

undoButton?.addEventListener('click', () => store.undo());
redoButton?.addEventListener('click', () => store.redo());

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
        if (pickerModal.handleEscape()) return true;
        if (residentModal.handleEscape()) return true;
        return false;
    },
    onTopicJump: () => {
        fields.topic.focus();
        fields.topic.select();
    },
    onCopyDoc: () => copyGDocData('shortcut'),
    onClear: () => clearButton.click(),
    onUndo: () => undoButton?.click(),
    onRedo: () => redoButton?.click()
});

let isInitialSync = true;

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
const syncUI = (state, { canUndo, canRedo }) => {
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

    const selectedCount = getSelectedResidents(state).length;
    if (residentAttendanceCount.textContent !== String(selectedCount)) {
        residentAttendanceCount.textContent = String(selectedCount);
        if (!isInitialSync) {
            residentAttendanceCount.classList.remove('count-pop');
            void residentAttendanceCount.offsetWidth;
            residentAttendanceCount.classList.add('count-pop');
        }
    }
    const attendanceLabel = residentAttendanceButton.querySelector('span');
    if (attendanceLabel) {
        const nextAttendanceText = selectedCount
            ? `${selectedCount} resident${selectedCount === 1 ? '' : 's'} selected`
            : '';
        setPickerLabel(attendanceLabel, nextAttendanceText);
    }
    residentAttendanceButton.classList.toggle('empty-picker', selectedCount === 0);

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
