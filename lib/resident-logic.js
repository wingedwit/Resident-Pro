/**
 * ResidentLogic - Centralized resident roster, options, and attendance calculation logic.
 */
(function attachResidentLogic(globalScope) {
    const RESIDENT_GROUPS = [
        { level: 'JR1', names: ['Dr. Prabhav', 'Dr. Muskan', 'Dr. Jyotsna', 'Dr. Mukesh'] },
        { level: 'JR2', names: ['Dr. Naresh', 'Dr. Vaibhav', 'Dr. Shivangi', 'Dr. Zahid'] },
        { level: 'JR3', names: ['Dr. Snigdha'] }
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
        'Dr. Vishakha',
        'Dr. Shreedhar',
        'Dr. Vyaktika',
        'Dr. Rahul',
        'Dr. Rohit'
    ];

    const TYPE_OPTIONS = [
        'Group discussion',
        'Journal club',
        'Seminar',
        'Microteaching',
        'Practical'
    ];

    const PRESENTER_OPTIONS = RESIDENT_GROUPS.flatMap((group) => group.names);
    const ALL_RESIDENTS = [...PRESENTER_OPTIONS];
    const ALL_RESIDENTS_SET = new Set(ALL_RESIDENTS);

    const normalizeResidentsPresent = (list) => {
        if (!Array.isArray(list) || list.length === 0) return [];
        const selectedSet = new Set(list);
        return ALL_RESIDENTS.filter((name) => selectedSet.has(name));
    };

    const getSelectedResidents = (state) => normalizeResidentsPresent(state?.residentsPresent);

    const displayValue = (value) => String(value ?? '').trim() || '-';

    const getAttendanceStats = (state) => {
        const presentResidents = getSelectedResidents(state);
        const presentSet = new Set(presentResidents);
        const absentResidents = ALL_RESIDENTS.filter((name) => !presentSet.has(name));
        const total = ALL_RESIDENTS.length;
        const presentCount = presentResidents.length;
        const absentCount = absentResidents.length;
        const presentPct = total > 0 ? (presentCount / total) * 100 : 0;
        const absentPct = total > 0 ? (absentCount / total) * 100 : 0;

        const groups = RESIDENT_GROUPS.map((group) => {
            const present = group.names.filter((name) => presentSet.has(name));
            const absent = group.names.filter((name) => !presentSet.has(name));
            return {
                level: group.level,
                total: group.names.length,
                present,
                absent,
                presentCount: present.length,
                absentCount: absent.length
            };
        });

        return {
            total,
            presentResidents,
            absentResidents,
            presentCount,
            absentCount,
            presentPct,
            absentPct,
            groups
        };
    };

    const getAttendanceSummaryLabel = (state) => {
        const stats = getAttendanceStats(state);
        if (stats.presentCount === 0) return '';
        const groupSummary = stats.groups
            .map((g) => `${g.level}: ${g.presentCount}/${g.total}`)
            .join(', ');
        return `${stats.presentCount}/${stats.total} Present (${groupSummary})`;
    };

    const getResidentsPresentText = (state) => {
        const selectedSet = new Set(getSelectedResidents(state));
        const lines = RESIDENT_GROUPS.map((group) => {
            const presentInGroup = group.names.filter((name) => selectedSet.has(name));
            return `${group.level} - ${presentInGroup.join(', ') || 'None'}`;
        });
        return lines.join('\n');
    };

    const getResidentsAbsentText = (state) => {
        const selectedSet = new Set(getSelectedResidents(state));
        const absent = [];
        RESIDENT_GROUPS.forEach((group) => {
            group.names.forEach((name) => {
                if (!selectedSet.has(name)) absent.push(name);
            });
        });
        return `Absent - ${absent.join(', ') || 'None'}`;
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

    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const buildGoogleDocPayload = (state) => {
        const rows = getReportRows(state).filter(([label]) => !(state.type === 'Practical' && label === 'Presenter'));
        const absentLine = getResidentsAbsentText(state);
        const escapedAbsent = escapeHtml(absentLine);
        const textLines = [];
        const htmlLines = [];

        for (let i = 0; i < rows.length; i++) {
            const [label, value] = rows[i];
            const escapedLabel = escapeHtml(label);
            const escapedValue = escapeHtml(value).replace(/\n/g, '<br>');

            if (label === 'Resident Present') {
                textLines.push(`${label}:\n${value}\n${absentLine}`);
                htmlLines.push(`<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}:<br>${escapedValue}<br>${escapedAbsent}</div>`);
            } else if (label === 'Date') {
                textLines.push(`${label}: ${value}`);
                htmlLines.push(`<div style="margin: 0; line-height: 1.15; font-weight: bold;">${escapedLabel}: ${escapedValue}</div>`);
            } else {
                textLines.push(`${label}: ${value}`);
                htmlLines.push(`<div style="margin: 0; line-height: 1.15; font-weight: normal;">${escapedLabel}: ${escapedValue}</div>`);
            }
        }

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('')
        };
    };

    const buildGoogleDocText = (state) => buildGoogleDocPayload(state).text;

    const buildGoogleDocHtml = (state) => buildGoogleDocPayload(state).html;

    globalScope.ResidentLogic = {
        RESIDENT_GROUPS,
        MODERATOR_OPTIONS,
        SENIOR_OPTIONS,
        TYPE_OPTIONS,
        PRESENTER_OPTIONS,
        ALL_RESIDENTS,
        normalizeResidentsPresent,
        getSelectedResidents,
        getAttendanceStats,
        getAttendanceSummaryLabel,
        displayValue,
        getResidentsPresentText,
        getResidentsAbsentText,
        getReportRows,
        buildGoogleDocPayload,
        buildGoogleDocText,
        buildGoogleDocHtml,
        escapeHtml
    };
})(window);
