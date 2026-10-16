(function attachResidentReportUI(globalScope) {
    const createReportRenderer = ({ liveReport, getReportRows, escapeHtml }) => {
        const cardTimers = new Map();

        const toCardSlug = (label) => label.toLowerCase().replace(/\s+/g, '-');

        const getReportCardClass = (label) => {
            const slug = toCardSlug(label);
            const wideClass = label === 'Topic' || label === 'Resident Present' ? ' wide-card' : '';
            return `report-card report-card-enter ${slug}-card${wideClass}`;
        };

        const initialize = (state) => {
            liveReport.innerHTML = `
                <div class="report-block">
                    ${getReportRows(state).map(([label, value], index) => {
                        const slug = toCardSlug(label);
                        return `
                        <div id="card-${slug}" class="${getReportCardClass(label)}" style="--card-i:${index}">
                            <div class="report-card-header">
                                <p class="report-label">${escapeHtml(label)}</p>
                            </div>
                            <p class="report-value">${escapeHtml(value)}</p>
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
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

            getReportRows(state).forEach(([label, value]) => {
                const slug = toCardSlug(label);
                const cardId = `card-${slug}`;
                const card = document.getElementById(cardId);
                const valueElement = card?.querySelector('.report-value');
                if (!valueElement || valueElement.textContent === value) return;
                valueElement.textContent = value;
                triggerCardUpdateAnimation(card, valueElement, slug);
            });
        };

        const setActiveCard = (activeSlug = '') => {
            if (!liveReport) return;
            const targetId = activeSlug ? `card-${activeSlug}` : '';
            liveReport.querySelectorAll('.report-card').forEach((card) => {
                card.classList.toggle('is-active-field-card', Boolean(targetId) && card.id === targetId);
            });
        };

        return { initialize, render, setActiveCard };
    };

    globalScope.ResidentReportUI = {
        createReportRenderer
    };
})(window);