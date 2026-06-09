(function attachResidentReportUI(globalScope) {
    const createReportRenderer = ({ liveReport, getReportRows, escapeHtml }) => {
        const getReportCardClass = (label) => {
            const wideClass = label === 'Topic' || label === 'Resident Present' ? ' wide-card' : '';
            return `report-card ${label.toLowerCase().replace(/\s+/g, '-')}-card${wideClass}`;
        };

        const initialize = (state) => {
            liveReport.innerHTML = `
                <div class="report-block">
                    ${getReportRows(state).map(([label, value]) => `
                        <div id="card-${label.toLowerCase().replace(/\s+/g, '-')}" class="${getReportCardClass(label)}">
                            <div class="report-card-header">
                                <p class="report-label">${escapeHtml(label)}</p>
                            </div>
                            <p class="report-value">${escapeHtml(value)}</p>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        const render = (state) => {
            if (!liveReport.querySelector('.report-block')) {
                initialize(state);
                return;
            }

            getReportRows(state).forEach(([label, value]) => {
                const cardId = `card-${label.toLowerCase().replace(/\s+/g, '-')}`;
                const card = document.getElementById(cardId);
                const valueElement = card?.querySelector('.report-value');
                if (!valueElement || valueElement.textContent === value) return;
                valueElement.textContent = value;
                card.classList.remove('flash');
                void card.offsetWidth;
                card.classList.add('flash');
            });
        };

        return { initialize, render };
    };

    globalScope.ResidentReportUI = {
        createReportRenderer
    };
})(window);
