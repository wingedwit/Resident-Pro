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
            structureRendered = true;
        };

        const filterChecklist = (query) => {
            const cleanQuery = query.trim().toLowerCase();
            const groups = checklist.querySelectorAll('.resident-group');
            let totalVisible = 0;

            groups.forEach((group) => {
                const options = group.querySelectorAll('.resident-option');
                let groupVisible = 0;

                options.forEach((option) => {
                    const name = option.querySelector('span')?.textContent.toLowerCase() || '';
                    const matches = !cleanQuery || name.includes(cleanQuery);
                    option.classList.toggle('hidden', !matches);
                    if (matches) {
                        groupVisible++;
                        totalVisible++;
                    }
                });

                group.classList.toggle('hidden', groupVisible === 0);
            });

            const showEmpty = cleanQuery.length > 0 && totalVisible === 0;
            emptySearch.classList.toggle('hidden', !showEmpty);
            searchClear.classList.toggle('hidden', cleanQuery.length === 0);
        };

        const syncCheckboxes = (selectedResidents = []) => {
            renderStructure();
            const selectedSet = new Set(selectedResidents);
            const residentCheckboxes = checklist.querySelectorAll('.resident-checkbox');
            residentCheckboxes.forEach((checkbox) => {
                const isChecked = selectedSet.has(checkbox.value);
                checkbox.checked = isChecked;
                const parentOption = checkbox.closest('.resident-option');
                if (parentOption) {
                    parentOption.classList.toggle('is-selected', isChecked);
                }
            });

            const groupCheckboxes = checklist.querySelectorAll('.group-checkbox');
            groupCheckboxes.forEach((groupCheckbox) => {
                const groupIndex = Number(groupCheckbox.dataset.groupIndex);
                const group = RESIDENT_GROUPS[groupIndex];
                if (group) {
                    groupCheckbox.checked = group.names.length > 0 && group.names.every((name) => selectedSet.has(name));
                }
            });

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
