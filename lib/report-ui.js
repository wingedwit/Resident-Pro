(function attachResidentReportUI(globalScope) {
    const createReportRenderer = ({ liveReport, getReportRows, escapeHtml, onCardActivate }) => {
        const cardTimers = new Map();
        let activeCardSlug = '';

        const toCardSlug = (label) => label.toLowerCase().replace(/\s+/g, '-');

        const getReportCardClass = (label) => {
            const slug = toCardSlug(label);
            const wideClass = label === 'Topic' || label === 'Resident Present' ? ' wide-card' : '';
            return `report-card report-card-enter ${slug}-card${wideClass}`;
        };

        const syncCardStates = (state) => {
            if (!liveReport) return;
            const isPractical = state?.type === 'Practical';
            const presenterCard = document.getElementById('card-presenter');
            if (presenterCard) {
                presenterCard.classList.toggle('is-disabled-card', isPractical);
                presenterCard.setAttribute('aria-disabled', isPractical ? 'true' : 'false');
                presenterCard.setAttribute('tabindex', isPractical ? '-1' : '0');
            }
        };

        const applyActiveCard = () => {
            if (!liveReport) return;
            const targetId = activeCardSlug ? `card-${activeCardSlug}` : '';
            liveReport.querySelectorAll('.report-card').forEach((card) => {
                card.classList.toggle('is-active-field-card', Boolean(targetId) && card.id === targetId);
            });
        };

        const initialize = (state) => {
            liveReport.innerHTML = `
                <div class="report-block">
                    ${getReportRows(state).map(([label, value], index) => {
                        const slug = toCardSlug(label);
                        return `
                        <div id="card-${slug}" data-card-slug="${slug}" role="button" tabindex="0" aria-label="Edit ${escapeHtml(label)}" class="${getReportCardClass(label)}" style="--card-i:${index}">
                            <div class="report-card-header">
                                <p class="report-label">${escapeHtml(label)}</p>
                            </div>
                            <p class="report-value">${escapeHtml(value)}</p>
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
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

        const render = (state) => {
            if (!liveReport.querySelector('.report-block')) {
                initialize(state);
                return;
            }

            syncCardStates(state);

            getReportRows(state).forEach(([label, value]) => {
                const slug = toCardSlug(label);
                const cardId = `card-${slug}`;
                const card = document.getElementById(cardId);
                const valueElement = card?.querySelector('.report-value');
                if (!valueElement || valueElement.textContent === value) return;
                valueElement.textContent = value;
                triggerCardUpdateAnimation(card, valueElement, slug);
            });

            applyActiveCard();
        };

        const setActiveCard = (nextSlug = '') => {
            activeCardSlug = nextSlug || '';
            applyActiveCard();
        };

        if (liveReport && typeof onCardActivate === 'function') {
            liveReport.addEventListener('click', (event) => {
                const card = event.target.closest('.report-card[data-card-slug]');
                if (!card || card.classList.contains('is-disabled-card') || card.getAttribute('aria-disabled') === 'true') return;
                const selection = window.getSelection ? window.getSelection().toString().trim() : '';
                if (selection.length > 0) return;
                onCardActivate(card.dataset.cardSlug, card);
            });

            liveReport.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                const card = event.target.closest('.report-card[data-card-slug]');
                if (!card || card.classList.contains('is-disabled-card') || card.getAttribute('aria-disabled') === 'true') return;
                event.preventDefault();
                onCardActivate(card.dataset.cardSlug, card);
            });
        }

        return { initialize, render, setActiveCard };
    };

    globalScope.ResidentReportUI = {
        createReportRenderer
    };
})(window);