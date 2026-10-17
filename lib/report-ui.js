(function attachResidentReportUI(globalScope) {
    const createReportRenderer = ({ liveReport, getReportRows, getAttendanceStats, escapeHtml, onCardActivate }) => {
        const cardTimers = new Map();
        const cardsBySlug = new Map();
        let reportBlockNode = null;
        let activeCardSlug = '';
        let lastAttendanceSignature = '';

        const resolveStats = (state) => {
            const statsFn = getAttendanceStats || globalScope.ResidentLogic?.getAttendanceStats;
            if (typeof statsFn === 'function') {
                return statsFn(state);
            }
            return null;
        };

        const toCardSlug = (label) => label.toLowerCase().replace(/\s+/g, '-');

        const getReportCardClass = (label) => {
            const slug = toCardSlug(label);
            const wideClass = label === 'Topic' || label === 'Resident Present' ? ' wide-card' : '';
            return `report-card report-card-enter ${slug}-card${wideClass}`;
        };

        const buildPresentPillsHtml = (stats) => {
            if (!stats) return '-';
            const pillsHtml = stats.presentResidents.length > 0
                ? stats.presentResidents.map((name) => `<span class="present-pill attendance-pill">${escapeHtml(name)}</span>`).join('')
                : `<span class="present-pill attendance-pill">None</span>`;
            return `<div class="attendance-pill-list" data-attendance-mode="present">${pillsHtml}</div>`;
        };

        const buildAbsentFooterHtml = (stats) => {
            if (!stats) return '';
            const pillsHtml = stats.absentResidents.length > 0
                ? stats.absentResidents.map((name) => `<span class="absent-pill attendance-pill">${escapeHtml(name)}</span>`).join('')
                : `<span class="absent-pill attendance-pill">None</span>`;
            return `
                <div class="report-absent-header">
                    <span class="report-absent-label">Absent</span>
                </div>
                <div class="attendance-pill-list">${pillsHtml}</div>
            `;
        };

        const syncCardStates = (state) => {
            if (!liveReport) return;
            const isPractical = state?.type === 'Practical';
            const presenterEntry = cardsBySlug.get('presenter');
            const presenterCard = presenterEntry?.card;
            if (presenterCard) {
                presenterCard.classList.toggle('is-disabled-card', isPractical);
                presenterCard.setAttribute('aria-disabled', isPractical ? 'true' : 'false');
                presenterCard.setAttribute('tabindex', isPractical ? '-1' : '0');
            }
        };

        const applyActiveCard = () => {
            if (!liveReport) return;
            cardsBySlug.forEach(({ card }, slug) => {
                card.classList.toggle('is-active-field-card', Boolean(activeCardSlug) && slug === activeCardSlug);
            });
        };

        const initialize = (state) => {
            cardsBySlug.clear();
            lastAttendanceSignature = '';
            const stats = resolveStats(state);
            liveReport.innerHTML = `
                <div class="report-block">
                    ${getReportRows(state).map(([label, value], index) => {
                        const slug = toCardSlug(label);
                        const isAttendanceCard = label === 'Resident Present';
                        const valueMarkup = isAttendanceCard && stats
                            ? `<div class="report-value">${buildPresentPillsHtml(stats)}</div>`
                            : `<p class="report-value">${escapeHtml(value)}</p>`;
                        const absentMarkup = isAttendanceCard && stats
                            ? `<div class="report-absent-footer" data-attendance-mode="absent" title="Click to edit in Absent mode">${buildAbsentFooterHtml(stats)}</div>`
                            : '';

                        return `
                        <div id="card-${slug}" data-card-slug="${slug}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(label)}" class="${getReportCardClass(label)}" style="--card-i:${index}">
                            <div class="report-card-header">
                                <p class="report-label">${escapeHtml(label)}</p>
                            </div>
                            ${valueMarkup}
                            ${absentMarkup}
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
            if (stats) {
                lastAttendanceSignature = `${stats.presentResidents.join('|')}::${stats.total}`;
            }
            reportBlockNode = liveReport.querySelector('.report-block');
            liveReport.querySelectorAll('.report-card[data-card-slug]').forEach((card) => {
                const slug = card.dataset.cardSlug;
                const valueEl = card.querySelector('.report-value');
                const absentFooterEl = card.querySelector('.report-absent-footer');
                if (slug && valueEl) {
                    cardsBySlug.set(slug, { card, valueEl, absentFooterEl });
                }
            });
            syncCardStates(state);
            applyActiveCard();
        };

        const triggerCardUpdateAnimation = (card, valueElement, slug) => {
            if (!card || !valueElement) return;

            card.classList.remove('report-card-enter');
            card.classList.remove('report-card-updated');
            void card.offsetWidth;
            card.classList.add('report-card-updated');

            const isTypingInTopic = slug === 'topic' && document.activeElement && document.activeElement.id === 'topicInput';
            if (!isTypingInTopic) {
                valueElement.classList.remove('report-value-updated');
                void valueElement.offsetWidth;
                valueElement.classList.add('report-value-updated');
            }

            const existingTimer = cardTimers.get(slug);
            if (existingTimer) clearTimeout(existingTimer);
            const timer = setTimeout(() => {
                card.classList.remove('report-card-updated');
                valueElement.classList.remove('report-value-updated');
                cardTimers.delete(slug);
            }, 550);
            cardTimers.set(slug, timer);
        };

        const syncAttendanceCard = (state) => {
            const entry = cardsBySlug.get('resident-present');
            if (!entry) return false;
            const stats = resolveStats(state);
            if (!stats) return false;

            const signature = `${stats.presentResidents.join('|')}::${stats.total}`;
            if (signature === lastAttendanceSignature) return true;
            lastAttendanceSignature = signature;

            entry.valueEl.innerHTML = buildPresentPillsHtml(stats);
            if (entry.absentFooterEl) {
                entry.absentFooterEl.innerHTML = buildAbsentFooterHtml(stats);
            }
            triggerCardUpdateAnimation(entry.card, entry.valueEl, 'resident-present');
            return true;
        };

        const render = (state) => {
            if (!reportBlockNode || !liveReport.contains(reportBlockNode)) {
                initialize(state);
                return;
            }

            syncCardStates(state);
            const handledAttendance = syncAttendanceCard(state);

            const rows = getReportRows(state);
            for (let i = 0; i < rows.length; i++) {
                const [label, value] = rows[i];
                const slug = toCardSlug(label);
                if (slug === 'resident-present' && handledAttendance) continue;
                const entry = cardsBySlug.get(slug);
                if (!entry || entry.valueEl.textContent === value) continue;
                entry.valueEl.textContent = value;
                triggerCardUpdateAnimation(entry.card, entry.valueEl, slug);
            }

            applyActiveCard();
        };

        const setActiveCard = (nextSlug = '') => {
            const normalized = nextSlug || '';
            if (activeCardSlug === normalized) return;
            activeCardSlug = normalized;
            applyActiveCard();
        };

        if (liveReport && typeof onCardActivate === 'function') {
            liveReport.addEventListener('click', (event) => {
                const card = event.target.closest('.report-card[data-card-slug]');
                if (!card || card.classList.contains('is-disabled-card') || card.getAttribute('aria-disabled') === 'true') return;
                const selection = window.getSelection ? window.getSelection().toString().trim() : '';
                if (selection.length > 0) return;
                const modeTrigger = event.target.closest('[data-attendance-mode]');
                const preferredMode = modeTrigger ? modeTrigger.dataset.attendanceMode : '';
                onCardActivate(card.dataset.cardSlug, card, preferredMode);
            });

            liveReport.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                const card = event.target.closest('.report-card[data-card-slug]');
                if (!card || card.classList.contains('is-disabled-card') || card.getAttribute('aria-disabled') === 'true') return;
                event.preventDefault();
                onCardActivate(card.dataset.cardSlug, card, '');
            });
        }

        return { initialize, render, setActiveCard };
    };

    globalScope.ResidentReportUI = {
        createReportRenderer
    };
})(window);