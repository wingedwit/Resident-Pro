(function attachResidentDatePicker(globalScope) {
    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const MONTH_SHORT = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const WEEKDAYS = [
        { short: 'S', full: 'Sunday' },
        { short: 'M', full: 'Monday' },
        { short: 'T', full: 'Tuesday' },
        { short: 'W', full: 'Wednesday' },
        { short: 'T', full: 'Thursday' },
        { short: 'F', full: 'Friday' },
        { short: 'S', full: 'Saturday' }
    ];

    const startOfDay = (date) => {
        const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const isSameDay = (a, b) => (
        Boolean(a && b) &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );

    const formatDateDDMMYYYY = (date) => {
        const safe = startOfDay(date);
        const d = String(safe.getDate()).padStart(2, '0');
        const m = String(safe.getMonth() + 1).padStart(2, '0');
        const y = safe.getFullYear();
        return `${d}-${m}-${y}`;
    };

    const parseDateString = (raw) => {
        if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
            return startOfDay(raw);
        }
        const value = String(raw || '').trim();
        const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
            const y = Number(isoMatch[1]);
            const m = Number(isoMatch[2]) - 1;
            const d = Number(isoMatch[3]);
            const dt = new Date(y, m, d);
            if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
                return dt;
            }
        }
        const dmyMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (dmyMatch) {
            const d = Number(dmyMatch[1]);
            const m = Number(dmyMatch[2]) - 1;
            const y = Number(dmyMatch[3]);
            const dt = new Date(y, m, d);
            if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
                return dt;
            }
        }
        return startOfDay(new Date());
    };

    const clampDayInMonth = (year, month, day) => {
        const maxDay = new Date(year, month + 1, 0).getDate();
        return Math.min(Math.max(1, day), maxDay);
    };

    const createDatePickerController = ({ dateInput, datePillButtons, dateUtils, onDateChange, getCurrentDate }) => {
        const { toLocalISODate } = dateUtils;

        let selectedDate = startOfDay(new Date());
        let focusedDate = new Date(selectedDate);
        let viewYear = selectedDate.getFullYear();
        let viewMonth = selectedDate.getMonth();
        let focusedMonth = viewMonth;
        let viewMode = 'days'; // 'days' | 'months'
        let isOpenState = false;

        let popoverEl = null;
        let titleBtn = null;
        let titleTextEl = null;
        let prevBtn = null;
        let nextBtn = null;
        let daysViewEl = null;
        let gridEl = null;
        let monthsViewEl = null;
        const dayButtons = [];
        const monthButtons = [];

        const syncSelectedFromExternal = () => {
            const raw = typeof getCurrentDate === 'function' ? getCurrentDate() : dateInput?.dataset?.isoDate || dateInput?.value;
            if (raw) {
                selectedDate = parseDateString(raw);
            }
        };

        const buildPopoverDOM = () => {
            if (popoverEl) return popoverEl;

            popoverEl = document.createElement('div');
            popoverEl.className = 'gcal-popover';
            popoverEl.setAttribute('role', 'dialog');
            popoverEl.setAttribute('aria-modal', 'false');
            popoverEl.setAttribute('aria-label', 'Choose session date');
            popoverEl.tabIndex = -1;

            // Header
            const headerEl = document.createElement('div');
            headerEl.className = 'gcal-header';

            titleBtn = document.createElement('button');
            titleBtn.type = 'button';
            titleBtn.className = 'gcal-title-btn';
            titleBtn.setAttribute('aria-live', 'polite');
            titleBtn.setAttribute('aria-expanded', 'false');
            titleBtn.title = 'Switch month or year';

            titleTextEl = document.createElement('span');
            titleTextEl.className = 'gcal-title-text';

            const caretSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            caretSvg.setAttribute('class', 'gcal-title-caret');
            caretSvg.setAttribute('viewBox', '0 0 20 20');
            caretSvg.setAttribute('fill', 'currentColor');
            caretSvg.setAttribute('aria-hidden', 'true');
            caretSvg.innerHTML = '<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>';

            titleBtn.append(titleTextEl, caretSvg);

            const navEl = document.createElement('div');
            navEl.className = 'gcal-nav';

            prevBtn = document.createElement('button');
            prevBtn.type = 'button';
            prevBtn.className = 'gcal-nav-btn gcal-prev-btn';
            prevBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 15L7.5 10L12.5 5"/></svg>';

            nextBtn = document.createElement('button');
            nextBtn.type = 'button';
            nextBtn.className = 'gcal-nav-btn gcal-next-btn';
            nextBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 15L12.5 10L7.5 5"/></svg>';

            navEl.append(prevBtn, nextBtn);
            headerEl.append(titleBtn, navEl);

            // Days view
            daysViewEl = document.createElement('div');
            daysViewEl.className = 'gcal-days-view';

            const weekdaysEl = document.createElement('div');
            weekdaysEl.className = 'gcal-weekdays';
            weekdaysEl.setAttribute('role', 'row');
            WEEKDAYS.forEach(({ short, full }) => {
                const span = document.createElement('span');
                span.className = 'gcal-weekday';
                span.textContent = short;
                span.setAttribute('aria-label', full);
                span.title = full;
                weekdaysEl.appendChild(span);
            });

            gridEl = document.createElement('div');
            gridEl.className = 'gcal-grid';
            gridEl.setAttribute('role', 'grid');
            gridEl.setAttribute('aria-label', 'Calendar dates');

            for (let i = 0; i < 42; i++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gcal-day';
                btn.dataset.index = String(i);
                dayButtons.push(btn);
                gridEl.appendChild(btn);
            }

            daysViewEl.append(weekdaysEl, gridEl);

            // Months view (hidden by default, replaces daysViewEl in-place when toggled)
            monthsViewEl = document.createElement('div');
            monthsViewEl.className = 'gcal-months-view hidden';
            monthsViewEl.hidden = true;
            monthsViewEl.setAttribute('role', 'grid');
            monthsViewEl.setAttribute('aria-label', 'Select month');

            for (let m = 0; m < 12; m++) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gcal-month-cell';
                btn.dataset.month = String(m);
                btn.textContent = MONTH_SHORT[m];
                btn.setAttribute('aria-label', MONTH_NAMES[m]);
                monthButtons.push(btn);
                monthsViewEl.appendChild(btn);
            }

            popoverEl.append(headerEl, daysViewEl, monthsViewEl);
            document.body.appendChild(popoverEl);

            titleBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleViewMode();
            });

            prevBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (viewMode === 'months') {
                    stepYear(-1);
                } else {
                    stepMonth(-1);
                }
            });

            nextBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                if (viewMode === 'months') {
                    stepYear(1);
                } else {
                    stepMonth(1);
                }
            });

            gridEl.addEventListener('click', (event) => {
                const btn = event.target.closest('.gcal-day');
                if (!btn) return;
                event.stopPropagation();
                const y = Number(btn.dataset.year);
                const m = Number(btn.dataset.month);
                const d = Number(btn.dataset.day);
                if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
                    commitDateSelection(new Date(y, m, d));
                }
            });

            monthsViewEl.addEventListener('click', (event) => {
                const btn = event.target.closest('.gcal-month-cell');
                if (!btn) return;
                event.stopPropagation();
                const m = Number(btn.dataset.month);
                if (!Number.isNaN(m)) {
                    viewMonth = m;
                    focusedMonth = m;
                    const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
                    focusedDate = new Date(viewYear, viewMonth, clampedDay);
                    setViewMode('days', true);
                }
            });

            popoverEl.addEventListener('keydown', handlePopoverKeydown);
            return popoverEl;
        };

        const renderDaysGrid = (moveFocusToDay = false) => {
            const today = startOfDay(new Date());
            const firstOfMonth = new Date(viewYear, viewMonth, 1);
            const startOffset = firstOfMonth.getDay();

            titleTextEl.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
            titleBtn.setAttribute('aria-expanded', 'false');
            prevBtn.setAttribute('aria-label', 'Previous month');
            prevBtn.title = 'Previous month';
            nextBtn.setAttribute('aria-label', 'Next month');
            nextBtn.title = 'Next month';

            let buttonToFocus = null;

            for (let i = 0; i < 42; i++) {
                const cellDate = new Date(viewYear, viewMonth, 1 - startOffset + i);
                const btn = dayButtons[i];
                const isOutside = cellDate.getMonth() !== viewMonth;
                const isToday = isSameDay(cellDate, today);
                const isSelected = isSameDay(cellDate, selectedDate);
                const isFocused = isSameDay(cellDate, focusedDate);

                btn.textContent = String(cellDate.getDate());
                btn.dataset.year = String(cellDate.getFullYear());
                btn.dataset.month = String(cellDate.getMonth());
                btn.dataset.day = String(cellDate.getDate());

                btn.classList.toggle('is-outside', isOutside);
                btn.classList.toggle('is-today', isToday);
                btn.classList.toggle('is-selected', isSelected);
                btn.classList.toggle('is-focused', isFocused);

                btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                if (isToday) {
                    btn.setAttribute('aria-current', 'date');
                } else {
                    btn.removeAttribute('aria-current');
                }
                btn.setAttribute(
                    'aria-label',
                    `${cellDate.getDate()} ${MONTH_NAMES[cellDate.getMonth()]} ${cellDate.getFullYear()}`
                );
                btn.tabIndex = isFocused ? 0 : -1;

                if (isFocused) {
                    buttonToFocus = btn;
                }
            }

            if (moveFocusToDay && buttonToFocus && isOpenState) {
                buttonToFocus.focus({ preventScroll: true });
            }
        };

        const renderMonthsGrid = (moveFocusToMonth = false) => {
            const today = startOfDay(new Date());
            titleTextEl.textContent = `${viewYear}`;
            titleBtn.setAttribute('aria-expanded', 'true');
            prevBtn.setAttribute('aria-label', 'Previous year');
            prevBtn.title = 'Previous year';
            nextBtn.setAttribute('aria-label', 'Next year');
            nextBtn.title = 'Next year';

            let buttonToFocus = null;

            for (let m = 0; m < 12; m++) {
                const btn = monthButtons[m];
                const isCurrentMonth = viewYear === today.getFullYear() && m === today.getMonth();
                const isSelectedMonth = viewYear === selectedDate.getFullYear() && m === selectedDate.getMonth();
                const isFocusedMonth = m === focusedMonth;

                btn.classList.toggle('is-today', isCurrentMonth);
                btn.classList.toggle('is-selected', isSelectedMonth);
                btn.classList.toggle('is-focused', isFocusedMonth);
                btn.setAttribute('aria-selected', isSelectedMonth ? 'true' : 'false');
                btn.setAttribute('aria-label', `${MONTH_NAMES[m]} ${viewYear}`);
                btn.tabIndex = isFocusedMonth ? 0 : -1;

                if (isFocusedMonth) {
                    buttonToFocus = btn;
                }
            }

            if (moveFocusToMonth && buttonToFocus && isOpenState) {
                buttonToFocus.focus({ preventScroll: true });
            }
        };

        const setViewMode = (nextMode, moveFocus = false) => {
            viewMode = nextMode;
            if (!popoverEl) return;
            const isMonths = viewMode === 'months';
            daysViewEl.classList.toggle('hidden', isMonths);
            daysViewEl.hidden = isMonths;
            monthsViewEl.classList.toggle('hidden', !isMonths);
            monthsViewEl.hidden = !isMonths;
            popoverEl.classList.toggle('is-months-mode', isMonths);

            if (isMonths) {
                focusedMonth = viewMonth;
                renderMonthsGrid(moveFocus);
            } else {
                renderDaysGrid(moveFocus);
            }
        };

        const toggleViewMode = () => {
            setViewMode(viewMode === 'days' ? 'months' : 'days', true);
        };

        const stepMonth = (deltaMonths, moveFocus = false) => {
            const targetFirst = new Date(viewYear, viewMonth + deltaMonths, 1);
            viewYear = targetFirst.getFullYear();
            viewMonth = targetFirst.getMonth();
            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
            focusedDate = new Date(viewYear, viewMonth, clampedDay);
            renderDaysGrid(moveFocus);
        };

        const stepYear = (deltaYears, moveFocus = false) => {
            viewYear += deltaYears;
            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
            focusedDate = new Date(viewYear, viewMonth, clampedDay);
            if (viewMode === 'months') {
                renderMonthsGrid(moveFocus);
            } else {
                renderDaysGrid(moveFocus);
            }
        };

        const moveFocusedDayBy = (deltaDays) => {
            const next = new Date(focusedDate);
            next.setDate(next.getDate() + deltaDays);
            focusedDate = startOfDay(next);
            viewYear = focusedDate.getFullYear();
            viewMonth = focusedDate.getMonth();
            renderDaysGrid(true);
        };

        const moveFocusedMonthBy = (deltaMonths) => {
            const totalMonths = viewYear * 12 + focusedMonth + deltaMonths;
            viewYear = Math.floor(totalMonths / 12);
            focusedMonth = ((totalMonths % 12) + 12) % 12;
            viewMonth = focusedMonth;
            renderMonthsGrid(true);
        };

        const positionPopover = () => {
            if (!popoverEl || !dateInput || !isOpenState) return;
            const rect = dateInput.getBoundingClientRect();
            const popWidth = popoverEl.offsetWidth || 284;
            const popHeight = popoverEl.offsetHeight || 292;
            const margin = 8;
            const viewportPad = 12;

            let top = rect.bottom + margin;
            let placeAbove = false;

            if (top + popHeight > window.innerHeight - viewportPad && rect.top - popHeight - margin > viewportPad) {
                top = rect.top - popHeight - margin;
                placeAbove = true;
            }

            let left = rect.left;
            if (left + popWidth > window.innerWidth - viewportPad) {
                left = Math.max(viewportPad, window.innerWidth - popWidth - viewportPad);
            }
            if (left < viewportPad) {
                left = viewportPad;
            }

            popoverEl.classList.toggle('gcal-above', placeAbove);
            popoverEl.style.top = `${Math.round(top)}px`;
            popoverEl.style.left = `${Math.round(left)}px`;
        };

        const updatePillButtons = (activeIsoDate) => {
            if (!datePillButtons) return;
            datePillButtons.forEach((button) => {
                const date = new Date();
                date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
                button.classList.toggle('active', activeIsoDate === toLocalISODate(date));
            });
        };

        const setDate = (dateValue) => {
            if (!dateValue) {
                if (dateInput) {
                    dateInput.value = '';
                    dateInput.dataset.isoDate = '';
                }
                updatePillButtons('');
                return;
            }
            const parsed = parseDateString(dateValue);
            selectedDate = parsed;
            focusedDate = new Date(parsed);
            viewYear = parsed.getFullYear();
            viewMonth = parsed.getMonth();
            focusedMonth = viewMonth;

            const isoStr = toLocalISODate(parsed);
            const displayStr = formatDateDDMMYYYY(parsed);

            if (dateInput) {
                dateInput.value = displayStr;
                dateInput.dataset.isoDate = isoStr;
            }
            if (popoverEl && isOpenState) {
                if (viewMode === 'months') {
                    renderMonthsGrid(false);
                } else {
                    renderDaysGrid(false);
                }
            }
            updatePillButtons(isoStr);
        };

        const commitDateSelection = (dateObj) => {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(6); } catch (_) {}
            }
            const isoStr = toLocalISODate(dateObj);
            setDate(isoStr);
            if (typeof onDateChange === 'function') {
                onDateChange(isoStr);
            }
            close({ restoreFocus: true });
        };

        const handleOutsidePointerDown = (event) => {
            if (!isOpenState || !popoverEl) return;
            const target = event.target;
            if (popoverEl.contains(target) || (dateInput && dateInput.contains(target))) {
                return;
            }
            close({ restoreFocus: false });
        };

        const handleViewportChange = () => {
            if (isOpenState) {
                positionPopover();
            }
        };

        const openDatePicker = ({ focusCalendar = true } = {}) => {
            buildPopoverDOM();
            syncSelectedFromExternal();
            focusedDate = new Date(selectedDate);
            viewYear = selectedDate.getFullYear();
            viewMonth = selectedDate.getMonth();
            focusedMonth = viewMonth;

            isOpenState = true;
            popoverEl.classList.add('open');
            if (dateInput) {
                dateInput.setAttribute('aria-expanded', 'true');
            }

            setViewMode('days', focusCalendar);
            positionPopover();

            document.addEventListener('pointerdown', handleOutsidePointerDown, true);
            window.addEventListener('resize', handleViewportChange, { passive: true });
            window.addEventListener('scroll', handleViewportChange, true);
        };

        const close = ({ restoreFocus = false } = {}) => {
            if (!isOpenState) return;
            isOpenState = false;
            if (popoverEl) {
                popoverEl.classList.remove('open');
            }
            if (dateInput) {
                dateInput.setAttribute('aria-expanded', 'false');
                if (restoreFocus) {
                    dateInput.focus({ preventScroll: true });
                }
            }
            document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };

        const handleEscape = () => {
            if (!isOpenState) return false;
            if (viewMode === 'months') {
                setViewMode('days', true);
                return true;
            }
            close({ restoreFocus: true });
            return true;
        };

        const handlePopoverKeydown = (event) => {
            if (!isOpenState) return;
            if (event.altKey || event.ctrlKey || event.metaKey) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                handleEscape();
                return;
            }

            if (viewMode === 'months') {
                switch (event.key) {
                    case 'ArrowLeft':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(-1);
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(1);
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(-3);
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        event.stopPropagation();
                        moveFocusedMonthBy(3);
                        break;
                    case 'PageUp':
                        event.preventDefault();
                        event.stopPropagation();
                        stepYear(-1, true);
                        break;
                    case 'PageDown':
                        event.preventDefault();
                        event.stopPropagation();
                        stepYear(1, true);
                        break;
                    case 'Enter':
                    case ' ':
                        if (document.activeElement?.classList.contains('gcal-month-cell')) {
                            event.preventDefault();
                            event.stopPropagation();
                            viewMonth = focusedMonth;
                            const clampedDay = clampDayInMonth(viewYear, viewMonth, focusedDate.getDate());
                            focusedDate = new Date(viewYear, viewMonth, clampedDay);
                            setViewMode('days', true);
                        }
                        break;
                    default:
                        break;
                }
                return;
            }

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-1);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(1);
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-7);
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(7);
                    break;
                case 'Home':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(-focusedDate.getDay());
                    break;
                case 'End':
                    event.preventDefault();
                    event.stopPropagation();
                    moveFocusedDayBy(6 - focusedDate.getDay());
                    break;
                case 'PageUp':
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.shiftKey) {
                        stepYear(-1, true);
                    } else {
                        stepMonth(-1, true);
                    }
                    break;
                case 'PageDown':
                    event.preventDefault();
                    event.stopPropagation();
                    if (event.shiftKey) {
                        stepYear(1, true);
                    } else {
                        stepMonth(1, true);
                    }
                    break;
                case 't':
                case 'T':
                    event.preventDefault();
                    event.stopPropagation();
                    commitDateSelection(new Date());
                    break;
                case 'Enter':
                case ' ':
                    if (document.activeElement?.classList.contains('gcal-day')) {
                        event.preventDefault();
                        event.stopPropagation();
                        commitDateSelection(focusedDate);
                    }
                    break;
                default:
                    break;
            }
        };

        const init = () => {
            if (dateInput) {
                if (dateInput.type !== 'text') {
                    dateInput.type = 'text';
                }
                dateInput.readOnly = true;
                dateInput.setAttribute('aria-haspopup', 'dialog');
                dateInput.setAttribute('aria-expanded', 'false');

                dateInput.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (isOpenState) {
                        close({ restoreFocus: false });
                    } else {
                        openDatePicker({ focusCalendar: true });
                    }
                });

                dateInput.addEventListener('keydown', (event) => {
                    if (event.altKey || event.ctrlKey || event.metaKey) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        openDatePicker({ focusCalendar: true });
                    } else if (event.key === 'Escape' && isOpenState) {
                        event.preventDefault();
                        event.stopPropagation();
                        handleEscape();
                    }
                });
            }

            if (datePillButtons) {
                datePillButtons.forEach((button, index) => {
                    button.addEventListener('click', () => {
                        if ('vibrate' in navigator) {
                            try { navigator.vibrate(8); } catch (_) {}
                        }
                        const date = new Date();
                        date.setDate(date.getDate() + Number(button.dataset.dateOffset || 0));
                        const nextDate = toLocalISODate(date);
                        setDate(nextDate);
                        onDateChange(nextDate);
                        if (isOpenState) {
                            close({ restoreFocus: false });
                        }
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
        };

        return {
            init,
            setDate,
            updatePillButtons,
            open: openDatePicker,
            close,
            isOpen: () => isOpenState,
            handleEscape,
            ensureLoaded: () => Promise.resolve()
        };
    };

    globalScope.ResidentDatePicker = {
        createDatePickerController
    };
})(window);
