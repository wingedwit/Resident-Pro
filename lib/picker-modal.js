(function attachResidentPickerModal(globalScope) {
    const createPickerModalController = ({ elements, modalManager, escapeHtml, onSelect, onClear, getTrackedModals }) => {
        const {
            modal,
            title,
            searchInput,
            searchClear,
            emptySearch,
            checklist,
            closeButton,
            clearButton,
            doneButton
        } = elements;

        let activePicker = null;

        const filterChecklist = (query) => {
            const cleanQuery = query.trim().toLowerCase();
            const groups = checklist.querySelectorAll('.resident-group');
            let totalVisible = 0;

            if (groups.length > 0) {
                groups.forEach((group) => {
                    const options = group.querySelectorAll('.picker-option');
                    let groupVisible = 0;

                    options.forEach((option) => {
                        const name = option.querySelector('.picker-option-label')?.textContent.toLowerCase() || '';
                        const matches = !cleanQuery || name.includes(cleanQuery);
                        option.classList.toggle('hidden', !matches);
                        if (matches) {
                            groupVisible++;
                            totalVisible++;
                        }
                    });

                    group.classList.toggle('hidden', groupVisible === 0);
                });
            } else {
                const options = checklist.querySelectorAll('.picker-option');
                options.forEach((option) => {
                    const name = option.querySelector('.picker-option-label')?.textContent.toLowerCase() || '';
                    const matches = !cleanQuery || name.includes(cleanQuery);
                    option.classList.toggle('hidden', !matches);
                    if (matches) totalVisible++;
                });
            }

            const showEmpty = cleanQuery.length > 0 && totalVisible === 0;
            emptySearch.classList.toggle('hidden', !showEmpty);
            searchClear.classList.toggle('hidden', cleanQuery.length === 0);
        };

        const close = () => {
            const returnBtn = activePicker?.returnButton;
            modalManager.closeModalWithAnimation(modal, () => {
                if (returnBtn) {
                    returnBtn.setAttribute('aria-expanded', 'false');
                    returnBtn.focus();
                }
            }, getTrackedModals);
            activePicker = null;
        };

        const open = (config, currentValue = '') => {
            activePicker = config;
            title.textContent = config.title;
            searchInput.value = '';
            const placeholderNoun = config.title.replace(/^Select\s+/i, '');
            searchInput.placeholder = `Search ${placeholderNoun}...`;
            searchClear.classList.add('hidden');
            emptySearch.classList.add('hidden');

            const selectedValue = String(currentValue || '');
            checklist.classList.toggle('grouped-checklist', Boolean(config.groups));
            checklist.innerHTML = config.groups
                ? config.groups.map((group) => `
                    <section class="resident-group">
                        <div class="resident-group-header">
                            <h3 class="resident-group-title">${escapeHtml(group.level)}</h3>
                        </div>
                        <div class="resident-group-list">
                            ${group.names.map((name) => `
                                <label class="picker-option ${selectedValue === name ? 'is-selected' : ''}">
                                    <span class="picker-option-label">${escapeHtml(name)}</span>
                                    <input type="radio" name="pickerChoice" value="${escapeHtml(name)}" ${selectedValue === name ? 'checked' : ''}>
                                </label>
                            `).join('')}
                        </div>
                    </section>
                `).join('')
                : config.options.map((name) => `
                    <label class="picker-option ${selectedValue === name ? 'is-selected' : ''}">
                        <span class="picker-option-label">${escapeHtml(name)}</span>
                        <input type="radio" name="pickerChoice" value="${escapeHtml(name)}" ${selectedValue === name ? 'checked' : ''}>
                    </label>
                `).join('');

            modal.classList.remove('hidden');
            modal.classList.remove('is-closing');
            if (typeof getTrackedModals === 'function') {
                modalManager.updateBodyScrollLock(getTrackedModals());
            }
            if (config.returnButton) {
                config.returnButton.setAttribute('aria-expanded', 'true');
            }
            searchInput.focus();
        };

        const init = () => {
            checklist.addEventListener('change', (event) => {
                if (!activePicker) return;
                const target = event.target;
                if (!target || target.type !== 'radio') return;
                checklist.querySelectorAll('.picker-option').forEach((opt) => {
                    const input = opt.querySelector('input[type="radio"]');
                    opt.classList.toggle('is-selected', input && input.checked);
                });
                onSelect(activePicker.stateKey, target.value);
                // Auto-close single-select picker after a brief moment
                setTimeout(close, 140);
            });

            searchInput?.addEventListener('input', (event) => {
                filterChecklist(event.target.value);
            });

            searchClear?.addEventListener('click', () => {
                searchInput.value = '';
                filterChecklist('');
                searchInput.focus();
            });

            closeButton?.addEventListener('click', close);
            doneButton?.addEventListener('click', close);

            clearButton?.addEventListener('click', () => {
                if (!activePicker) return;
                onClear(activePicker.stateKey);
                checklist.querySelectorAll('input[type="radio"]').forEach((input) => {
                    input.checked = false;
                });
                checklist.querySelectorAll('.picker-option').forEach((opt) => {
                    opt.classList.remove('is-selected');
                });
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
            isOpen,
            handleEscape
        };
    };

    globalScope.ResidentPickerModal = {
        createPickerModalController
    };
})(window);
