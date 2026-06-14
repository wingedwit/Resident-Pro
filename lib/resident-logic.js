(function attachResidentLogic(globalScope) {
    const RESIDENT_GROUPS = [
        { level: 'JR1', names: ['Dr. Prabhav', 'Dr. Muskan', 'Dr. Jyotsna', 'Dr. Mukesh'] },
        { level: 'JR2', names: ['Dr. Naresh', 'Dr. Vaibhav', 'Dr. Shivangi', 'Dr. Zahid'] },
        { level: 'JR3', names: ['Dr. Saumya', 'Dr. Malhar', 'Dr. Anurag', 'Dr. Danish', 'Dr. Snigdha'] }
    ];

    const MODERATOR_OPTIONS = [
        'Dr. Arpita Singh',
        'Dr. Pooja Shukla',
        'Dr. Himanshu Sharma',
        'Dr. Garima Adhaulia',
        'Dr. Govind Mishra',
        'Dr. Parul Kamal'
    ];

    const SENIOR_OPTIONS = [
        'Dr. Harshika',
        'Dr. Anjali',
        'Dr. Vishakha'
    ];

    const TYPE_OPTIONS = [
        'Group discussion',
        'Journal club',
        'Seminar',
        'Practical'
    ];

    const PRESENTER_OPTIONS = RESIDENT_GROUPS.flatMap((group) => group.names);
    const ALL_RESIDENTS = [...PRESENTER_OPTIONS];

    const getSelectedResidents = (state) => (Array.isArray(state.residentsPresent) ? state.residentsPresent : []);
    const displayValue = (value) => String(value ?? '').trim() || '-';

    const getResidentsPresentText = (state) => {
        const selected = getSelectedResidents(state);
        const lines = RESIDENT_GROUPS.map(group => {
            const presentInGroup = group.names.filter(name => selected.includes(name));
            return `${group.level} - ${presentInGroup.join(', ')}`;
        });
        return lines.join('\n');
    };

    const getResidentsAbsentText = (state) => {
        const selected = getSelectedResidents(state);
        const absent = [];
        RESIDENT_GROUPS.forEach(group => {
            group.names.forEach(name => {
                if (!selected.includes(name)) {
                    absent.push(name);
                }
            });
        });
        return `Absent - ${absent.join(', ')}`;
    };

    const getReportRows = (state) => {
        const formatDate = (globalScope.ResidentDateUtils && globalScope.ResidentDateUtils.formatDate) || ((d) => d);
        return [
            ['Date', formatDate(state.date)],
            ['Topic', displayValue(state.topic)],
            ['Type', displayValue(state.type)],
            ['Presenter', displayValue(state.presenter)],
            ['Senior Resident', displayValue(state.seniorResident)],
            ['Moderator', displayValue(state.moderator)],
            ['Resident Present', getResidentsPresentText(state)]
        ];
    };

    const buildGoogleDocText = (state) => getReportRows(state)
        .filter(([label]) => !(state.type === 'Practical' && label === 'Presenter'))
        .map(([label, value]) => {
            if (label === 'Resident Present') {
                return `${label}:\n${value}\n${getResidentsAbsentText(state)}`;
            }
            return `${label}: ${value}`;
        }).join('\n');

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const buildGoogleDocHtml = (state) => getReportRows(state)
        .filter(([label]) => !(state.type === 'Practical' && label === 'Presenter'))
        .map(([label, value]) => {
            const escapedLabel = escapeHtml(label);
            const escapedValue = escapeHtml(value).replace(/\n/g, '<br>');
            
            if (label === 'Date') {
                return `<div style="margin: 0; line-height: 1.15; font-weight: bold;">${escapedLabel}: ${escapedValue}</div>`;
            }
            if (label === 'Resident Present') {
                const escapedAbsent = escapeHtml(getResidentsAbsentText(state));
                return `<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}:<br>${escapedValue}<br>${escapedAbsent}</div>`;
            }
            return `<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}: ${escapedValue}</div>`;
        }).join('');

    globalScope.ResidentLogic = {
        RESIDENT_GROUPS,
        MODERATOR_OPTIONS,
        SENIOR_OPTIONS,
        TYPE_OPTIONS,
        PRESENTER_OPTIONS,
        ALL_RESIDENTS,
        getSelectedResidents,
        displayValue,
        getResidentsPresentText,
        getResidentsAbsentText,
        getReportRows,
        buildGoogleDocText,
        buildGoogleDocHtml,
        escapeHtml
    };
})(window);
