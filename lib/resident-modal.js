(function attachResidentAttendanceModal(globalScope) {
    const createResidentModalController = ({
        elements,
        modalManager,
        residentLogic,
        onSelectionChange,
        getTrackedModals,
        getActivePresenter
    }) => {
        const {
            modal,
            triggerButton,
            searchInput,
            searchClear,
            emptySearch,
            checklist,
            closeButton,
            clearButton,
            doneButton,
            modeToggle
        } = elements;

        const {
            RESIDENT_GROUPS,
            ALL_RESIDENTS,
            normalizeResidentsPresent,
            escapeHtml
        } = residentLogic;

        let structureRendered = false;
        let cachedGroups = [];
        let cachedResidentOptions = [];
        let inputMode = 'present';
        let currentQuery = '';
        let hasCommittedInSession = false;

        const modeButtons = modeToggle ? Array.from(modeToggle.querySelectorAll('button[data-mode]')) : [];

        const resolveActivePresenter = () => (
            typeof getActivePresenter === 'function' ? String(getActivePresenter() || '') : ''
        );

        const normalizeList = (list) => (
            typeof normalizeResidentsPresent === 'function'
                ? normalizeResidentsPresent(list)
                : (Array.isArray(list) ? [...new Set(list)] : [])
        );

        const commitSelection = (nextPresent) => {
            const normalized = normalizeList(nextPresent);
            onSelectionChange(normalized, { replaceUndo: hasCommittedInSession });
            hasCommittedInSession = true;
            syncCheckboxes(normalized);
        };

        const resetUndoSession = () => {
            hasCommittedInSession = false;
        };

        const updateModeUI = (nextMode) => {
            inputMode = nextMode === 'absent' ? 'absent' : 'present';
            if (modal) {
                modal.dataset.attendanceMode = inputMode;
            }
            if (modeToggle) {
                modeToggle.dataset.activeMode = inputMode;
            }
            for (let i = 0; i < modeButtons.length; i++) {
                const btn = modeButtons[i];
                const isActive = btn.dataset.mode === inputMode;
                btn.classList.toggle('active', isActive);
                btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            }
        };

        const renderStructure = () => {
            if (structureRendered && checklist.children.length > 0) return;
            checklist.innerHTML = RESIDENT_GROUPS.map((group, groupIndex) => `
                <section class="resident-group" data-group-index="${groupIndex}">
                    <div class="resident-group-header">
                        <div class="resident-group-heading">
                            <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
                            <span class="resident-group-count">0/${group.names.length}</span>
                        </div>
                        <label class="group-select-all" aria-label="Select all ${escapeHtml(group.level)}">
                            <input type="checkbox" class="group-checkbox" data-group-index="${groupIndex}">
                            <span>All</span>
                        </label>
                    </div>
                    <div class="resident-group-list">
                        ${group.names.map((name) => `
                            <label class="resident-option">
                                <input type="checkbox" class="resident-checkbox" value="${escapeHtml(name)}">
                                <span class="resident-option-name">${escapeHtml(name)}</span>
                                <span class="resident-presenter-badge hidden" title="Session Presenter">Presenter</span>
                            </label>
                        `).join('')}
                    </div>
                </section>
            `).join('');

            cachedGroups = [];
            cachedResidentOptions = [];
            checklist.querySelectorAll('.resident-group').forEach((groupEl) => {
                const groupIndex = Number(groupEl.dataset.groupIndex);
                const groupCheckbox = groupEl.querySelector('.group-checkbox');
                const groupCountEl = groupEl.querySelector('.resident-group-count');
                const groupDef = RESIDENT_GROUPS[groupIndex];
                const groupLevel = groupDef ? groupDef.level : '';
                const options = [];
                groupEl.querySelectorAll('.resident-option').forEach((optionEl) => {
                    const checkboxEl = optionEl.querySelector('.resident-checkbox');
                    const labelSpan = optionEl.querySelector('.resident-option-name');
                    const presenterBadgeEl = optionEl.querySelector('.resident-presenter-badge');
                    const nameText = labelSpan?.textContent || '';
                    const item = {
                        optionEl,
                        checkboxEl,
                        presenterBadgeEl,
                        value: checkboxEl ? checkboxEl.value : '',
                        searchText: `${nameText} ${groupLevel}`.toLowerCase(),
                        isVisible: true
                    };
                    options.push(item);
                    cachedResidentOptions.push(item);
                });
                cachedGroups.push({
                    groupEl,
                    groupCheckbox,
                    groupCountEl,
                    groupNames: groupDef ? groupDef.names : [],
                    options
                });
            });
            structureRendered = true;
        };

        const filterChecklist = (query) => {
            currentQuery = query.trim().toLowerCase();
            let totalVisible = 0;

            for (let g = 0; g < cachedGroups.length; g++) {
                const { groupEl, options } = cachedGroups[g];
                let groupVisible = 0;

                for (let i = 0; i < options.length; i++) {
                    const item = options[i];
                    const matches = !currentQuery || item.searchText.includes(currentQuery);
                    item.isVisible = matches;
                    item.optionEl.classList.toggle('hidden', !matches);
                    if (matches) {
                        groupVisible++;
                        totalVisible++;
                    }
                }

                groupEl.classList.toggle('hidden', groupVisible === 0);
            }

            const showEmpty = currentQuery.length > 0 && totalVisible === 0;
            emptySearch.classList.toggle('hidden', !showEmpty);
            searchClear.classList.toggle('hidden', currentQuery.length === 0);
        };

        const syncCheckboxes = (selectedResidents = []) => {
            renderStructure();
            const normalizedPresent = normalizeList(selectedResidents);
            const selectedSet = new Set(normalizedPresent);
            const activePresenter = resolveActivePresenter();
            const isAbsentMode = inputMode === 'absent';

            for (let i = 0; i < cachedResidentOptions.length; i++) {
                const { optionEl, checkboxEl, presenterBadgeEl, value } = cachedResidentOptions[i];
                const isPresent = selectedSet.has(value);
                const isChecked = isAbsentMode ? !isPresent : isPresent;
                const isPresenter = Boolean(activePresenter) && value === activePresenter;

                if (checkboxEl) checkboxEl.checked = isChecked;
                optionEl.classList.toggle('is-selected', !isAbsentMode && isChecked);
                optionEl.classList.toggle('is-absent-selected', isAbsentMode && isChecked);
                optionEl.classList.toggle('is-presenter', isPresenter);
                if (presenterBadgeEl) {
                    presenterBadgeEl.classList.toggle('hidden', !isPresenter);
                }
            }

            for (let g = 0; g < cachedGroups.length; g++) {
                const { groupCheckbox, groupCountEl, groupNames } = cachedGroups[g];
                const groupTotal = groupNames.length;
                let checkedInGroup = 0;
                for (let n = 0; n < groupTotal; n++) {
                    const isPresent = selectedSet.has(groupNames[n]);
                    if (isAbsentMode ? !isPresent : isPresent) {
                        checkedInGroup++;
                    }
                }
                if (groupCountEl) {
                    groupCountEl.textContent = `${checkedInGroup}/${groupTotal}`;
                }
                if (groupCheckbox) {
                    groupCheckbox.checked = groupTotal > 0 && checkedInGroup === groupTotal;
                    groupCheckbox.indeterminate = checkedInGroup > 0 && checkedInGroup < groupTotal;
                }
            }
        };

        const close = () => {
            resetUndoSession();
            modalManager.closeModalWithAnimation(modal, () => {
                if (triggerButton) {
                    triggerButton.setAttribute('aria-expanded', 'false');
                    triggerButton.focus();
                }
            }, getTrackedModals);
        };

        const open = (selectedResidents = [], initialMode = 'present') => {
            renderStructure();
            resetUndoSession();
            updateModeUI(initialMode);
            searchInput.value = '';
            searchClear.classList.add('hidden');
            emptySearch.classList.add('hidden');
            filterChecklist('');
            syncCheckboxes(selectedResidents);
            modal.classList.remove('hidden');
            modal.classList.remove('is-closing');
            if (typeof getTrackedModals === 'function') {
                modalManager.updateBodyScrollLock(getTrackedModals());
            }
            if (triggerButton) {
                triggerButton.setAttribute('aria-expanded', 'true');
            }
            searchInput.focus();
        };

        const init = (getCurrentSelected) => {
            const readCurrentPresent = () => {
                const raw = typeof getCurrentSelected === 'function' ? getCurrentSelected() : [];
                return normalizeList(raw);
            };

            triggerButton?.addEventListener('click', () => {
                open(readCurrentPresent(), 'present');
            });

            closeButton?.addEventListener('click', close);
            doneButton?.addEventListener('click', close);

            modeToggle?.addEventListener('click', (event) => {
                const btn = event.target.closest('button[data-mode]');
                if (!btn) return;
                const nextMode = btn.dataset.mode;
                if (!nextMode || nextMode === inputMode) return;

                const currentPresent = readCurrentPresent();
                updateModeUI(nextMode);

                // Parity with Attendance-Pro: when switching from an empty Present roster to Absent mode,
                // start with 0 Absent (all Present) so the user can simply check the absentees.
                if (nextMode === 'absent' && currentPresent.length === 0) {
                    commitSelection([...ALL_RESIDENTS]);
                    return;
                }
                syncCheckboxes(currentPresent);
            });

            clearButton?.addEventListener('click', () => {
                const nextPresent = inputMode === 'absent' ? [...ALL_RESIDENTS] : [];
                commitSelection(nextPresent);
            });

            checklist.addEventListener('change', (e) => {
                const currentPresent = readCurrentPresent();
                const isAbsentMode = inputMode === 'absent';

                if (e.target.classList.contains('group-checkbox')) {
                    const groupIndex = Number(e.target.dataset.groupIndex);
                    const group = RESIDENT_GROUPS[groupIndex];
                    if (!group) return;
                    const isChecked = e.target.checked;

                    const presentSet = new Set(currentPresent);
                    group.names.forEach((name) => {
                        const shouldBePresent = isAbsentMode ? !isChecked : isChecked;
                        if (shouldBePresent) presentSet.add(name);
                        else presentSet.delete(name);
                    });

                    commitSelection(Array.from(presentSet));
                    return;
                }

                if (e.target.classList.contains('resident-checkbox')) {
                    const name = e.target.value;
                    const isChecked = e.target.checked;
                    const shouldBePresent = isAbsentMode ? !isChecked : isChecked;
                    const presentSet = new Set(currentPresent);
                    if (shouldBePresent) presentSet.add(name);
                    else presentSet.delete(name);

                    commitSelection(Array.from(presentSet));
                }
            });

            searchInput?.addEventListener('input', (event) => {
                filterChecklist(event.target.value);
            });

            searchClear?.addEventListener('click', () => {
                searchInput.value = '';
                filterChecklist('');
                searchInput.focus();
            });

            modal.addEventListener('click', (event) => {
                if (event.target === modal) close();
            });

            modal.addEventListener('keydown', (event) => {
                if (!modal.classList.contains('hidden')) {
                    modalManager.trapFocusInModal(modal, event);
                }
            });
        };

        const isOpen = () => modalManager.isModalOpen(modal);

        const handleEscape = () => {
            if (!isOpen()) return false;
            if (document.activeElement === searchInput && searchInput.value) {
                searchInput.value = '';
                filterChecklist('');
                return true;
            }
            close();
            return true;
        };

        return {
            init,
            open,
            close,
            syncCheckboxes,
            resetUndoSession,
            isOpen,
            handleEscape
        };
    };

    globalScope.ResidentModal = {
        createResidentModalController
    };
})(window);
