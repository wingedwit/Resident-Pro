(function attachResidentConfig(globalScope) {
    const STORAGE_KEY = 'residentProData';
    const MAX_UNDO_HISTORY = 200;

    const createInitialState = (date) => ({
        date,
        topic: '',
        type: '',
        presenter: '',
        seniorResident: '',
        moderator: '',
        residentsPresent: []
    });

    globalScope.ResidentConfig = {
        STORAGE_KEY,
        MAX_UNDO_HISTORY,
        createInitialState
    };
})(window);
