(function attachDateUtils(globalScope) {
    const toLocalISODate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayISO = () => toLocalISODate(new Date());

    const formatDate = (isoDate) => {
        if (!isoDate) return '-';
        const date = new Date(`${isoDate}T00:00:00`);
        if (Number.isNaN(date.getTime())) return isoDate;
        const dateText = new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
        return `${dateText}, ${dayName}`;
    };

    globalScope.ResidentDateUtils = {
        toLocalISODate,
        todayISO,
        formatDate
    };
})(window);
