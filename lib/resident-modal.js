(function attachResidentAttendanceModal(globalScope) {
    const createResidentModalController = ({ elements, modalManager, residentLogic, onSelectionChange, getTrackedModals }) => {
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
            selectAllCheckbox
        } = elements;

        const {
            RESIDENT_GROUPS,
            ALL_RESIDENTS,
            escapeHtml
        } = residentLogic;

        let structureRendered = false;
        let cachedGroups = [];
        let cachedResidentOptions = [];

        const renderStructure = () => {
            if (structureRendered && checklist.children.length > 0) return;
            checklist.innerHTML = RESIDENT_GROUPS.map((group, groupIndex) => `
                <section class="resident-group" data-group-index="${groupIndex}">
                    <div class="resident-group-header">
                        <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
                        <label class="group-select-all" aria-label="Select all ${escapeHtml(group.level)}">
                            <input type="checkbox" class="group-checkbox" data-group-index="${groupIndex}">
                            <span>All</span>
                        </label>
                    </div>
                    <div class="resident-group-list">
                        ${group.names.map((name) => `
                            <label class="resident-option">
                                <input type="checkbox" class="resident-checkbox" value="${escapeHtml(name)}">
                                <span>${escapeHtml(name)}</span>
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
                const groupDef = RESIDENT_GROUPS[groupIndex];
                const options = [];
                groupEl.querySelectorAll('.resident-option').forEach((optionEl) => {
                    const checkboxEl = optionEl.querySelector('.resident-checkbox');
                    const labelSpan = optionEl.querySelector('span');
                    const item = {
                        optionEl,
                        checkboxEl,
                        value: checkboxEl ? checkboxEl.value : '',
                        searchText: (labelSpan?.textContent || '').toLowerCase()
                    };
                    options.push(item);
                    cachedResidentOptions.push(item);
                });
                cachedGroups.push({
                    groupEl,
                    groupCheckbox,
                    groupNames: groupDef ? groupDef.names : [],
                    options
                });
            });
            structureRendered = true;
        };

        const filterChecklist = (query) => {
            const cleanQuery = query.trim().toLowerCase();
            let totalVisible = 0;

            for (let g = 0; g < cachedGroups.length; g++) {
                const { groupEl, options } = cachedGroups[g];
                let groupVisible = 0;

                for (let i = 0; i < options.length; i++) {
                    const { optionEl, searchText } = options[i];
                    const matches = !cleanQuery || searchText.includes(cleanQuery);
                    optionEl.classList.toggle('hidden', !matches);
                    if (matches) {
                        groupVisible++;
                        totalVisible++;
                    }
                }

                groupEl.classList.toggle('hidden', groupVisible === 0);
            }

            const showEmpty = cleanQuery.length > 0 && totalVisible === 0;
            emptySearch.classList.toggle('hidden', !showEmpty);
            searchClear.classList.toggle('hidden', cleanQuery.length === 0);
        };

        const syncCheckboxes = (selectedResidents = []) => {
            renderStructure();
            const selectedSet = new Set(selectedResidents);

            for (let i = 0; i < cachedResidentOptions.length; i++) {
                const { optionEl, checkboxEl, value } = cachedResidentOptions[i];
                const isChecked = selectedSet.has(value);
                if (checkboxEl) checkboxEl.checked = isChecked;
                optionEl.classList.toggle('is-selected', isChecked);
            }

            for (let g = 0; g < cachedGroups.length; g++) {
                const { groupCheckbox, groupNames } = cachedGroups[g];
                if (groupCheckbox) {
                    groupCheckbox.checked = groupNames.length > 0 && groupNames.every((name) => selectedSet.has(name));
                }
            }

            if (selectAllCheckbox) {
                selectAllCheckbox.checked = ALL_RESIDENTS.length > 0 && selectedSet.size === ALL_RESIDENTS.length;
            }
        };

        const close = () => {
            modalManager.closeModalWithAnimation(modal, () => {
                if (triggerButton) {
                    triggerButton.setAttribute('aria-expanded', 'false');
                    triggerButton.focus();
                }
            }, getTrackedModals);
        };

        const open = (selectedResidents = []) => {
            renderStructure();
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
            triggerButton?.addEventListener('click', () => {
                const current = typeof getCurrentSelected === 'function' ? getCurrentSelected() : [];
                open(current);
            });

            closeButton?.addEventListener('click', close);
            doneButton?.addEventListener('click', close);

            clearButton?.addEventListener('click', () => {
                onSelectionChange([]);
                syncCheckboxes([]);
            });

            checklist.addEventListener('change', (e) => {
                const currentSelected = typeof getCurrentSelected === 'function' ? getCurrentSelected() : [];
                if (e.target.classList.contains('group-checkbox')) {
                    const groupIndex = e.target.dataset.groupIndex;
                    const group = RESIDENT_GROUPS[groupIndex];
                    const isChecked = e.target.checked;

                    let selectedSet = new Set(currentSelected);
                    group.names.forEach((name) => {
                        if (isChecked) selectedSet.add(name);
                        else selectedSet.delete(name);
                    });

                    const nextSelected = Array.from(selectedSet);
                    onSelectionChange(nextSelected);
                    syncCheckboxes(nextSelected);
                    return;
                }

                const selected = Array.from(checklist.querySelectorAll('.resident-checkbox:checked')).map((input) => input.value);
                onSelectionChange(selected);
                syncCheckboxes(selected);
            });

            selectAllCheckbox?.addEventListener('change', () => {
                const next = selectAllCheckbox.checked ? [...ALL_RESIDENTS] : [];
                onSelectionChange(next);
                syncCheckboxes(next);
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
            isOpen,
            handleEscape
        };
    };

    globalScope.ResidentModal = {
        createResidentModalController
    };
})(window);
