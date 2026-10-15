(function attachResidentDatePicker(globalScope) {
    const FLATPICKR_SCRIPT_SRC = './assets/vendor/flatpickr/flatpickr.min.js';

    const createDatePickerController = ({ dateInput, datePillButtons, dateUtils, onDateChange, getCurrentDate }) => {
        const { toLocalISODate } = dateUtils;
        let flatpickrLoadPromise = null;
        let flatpickrInstance = null;

        const enableFlatpickrThemeStyles = () => {
            const themeLink = document.getElementById('flatpickr-theme');
            if (!themeLink) return;
            themeLink.dataset.enabled = 'true';
            if (themeLink.dataset.pendingHref) {
                themeLink.href = themeLink.dataset.pendingHref;
            }
        };

        const upgradeDatePicker = () => {
            if (flatpickrInstance || !window.flatpickr || !dateInput) return;
            enableFlatpickrThemeStyles();
            flatpickrInstance = window.flatpickr(dateInput, {
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'd-m-Y',
                onChange: (selectedDates, dateStr) => {
                    onDateChange(dateStr);
                }
            });
            const currentDate = typeof getCurrentDate === 'function' ? getCurrentDate() : dateInput.value;
            if (currentDate) {
                flatpickrInstance.setDate(currentDate, false);
            }
        };

        const ensureFlatpickrLoaded = () => {
            if (window.flatpickr) {
                upgradeDatePicker();
                return Promise.resolve();
            }
            if (flatpickrLoadPromise) return flatpickrLoadPromise;

            enableFlatpickrThemeStyles();
            flatpickrLoadPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = FLATPICKR_SCRIPT_SRC;
                script.async = true;
                script.onload = () => {
                    upgradeDatePicker();
                    resolve();
                };
                script.onerror = () => {
                    flatpickrLoadPromise = null;
                    reject(new Error('Failed to load flatpickr'));
                };
                document.head.appendChild(script);
            });
            return flatpickrLoadPromise;
        };

        const openDatePicker = () => {
            if (flatpickrInstance) {
                flatpickrInstance.open();
            } else {
                ensureFlatpickrLoaded()
                    .then(() => {
                        if (flatpickrInstance) flatpickrInstance.open();
                    })
                    .catch(() => {
                        try {
                            dateInput.showPicker();
                        } catch (error) {
                            console.warn('showPicker is not supported or failed:', error);
                        }
                    });
            }
        };

        const setDate = (dateStr) => {
            if (dateInput) {
                dateInput.value = dateStr || '';
            }
            if (flatpickrInstance && dateStr) {
                flatpickrInstance.setDate(dateStr, false);
            }
            updatePillButtons(dateStr);
        };

        const updatePillButtons = (activeDate) => {
            if (!datePillButtons) return;
            datePillButtons.forEach((button) => {
                const date = new Date();
                date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
                button.classList.toggle('active', activeDate === toLocalISODate(date));
            });
        };

        const init = () => {
            if (dateInput) {
                dateInput.addEventListener('click', openDatePicker);
            }

            if (datePillButtons) {
                datePillButtons.forEach((button, index) => {
                    button.addEventListener('click', () => {
                        const date = new Date();
                        date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
                        const nextDate = toLocalISODate(date);
                        setDate(nextDate);
                        onDateChange(nextDate);
                    });

                    button.addEventListener('keydown', (event) => {
                        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                            event.preventDefault();
                            const direction = event.key === 'ArrowRight' ? 1 : -1;
                            const nextIndex = (index + direction + datePillButtons.length) % datePillButtons.length;
                            datePillButtons[nextIndex].focus();
                            datePillButtons[nextIndex].click();
                        }
                    });
                });
            }

            window.addEventListener('load', () => {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => ensureFlatpickrLoaded().catch(() => {}));
                } else {
                    setTimeout(() => ensureFlatpickrLoaded().catch(() => {}), 1000);
                }
            });
        };

        return {
            init,
            setDate,
            updatePillButtons,
            open: openDatePicker,
            ensureLoaded: ensureFlatpickrLoaded
        };
    };

    globalScope.ResidentDatePicker = {
        createDatePickerController
    };
})(window);
