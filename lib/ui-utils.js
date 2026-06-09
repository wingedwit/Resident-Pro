(function attachResidentUIUtils(globalScope) {
    const createToast = (toastElement, duration = 1800) => {
        let timer = null;

        return (message) => {
            if (!toastElement) return;
            toastElement.textContent = message;
            toastElement.classList.add('show');
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                toastElement.classList.remove('show');
            }, duration);
        };
    };

    const copyText = async (plainText, htmlText) => {
        if (navigator.clipboard && window.ClipboardItem && htmlText) {
            try {
                const item = new ClipboardItem({
                    'text/plain': new Blob([plainText], { type: 'text/plain' }),
                    'text/html': new Blob([htmlText], { type: 'text/html' })
                });
                await navigator.clipboard.write([item]);
                return;
            } catch (error) {
                console.warn('Rich clipboard copy failed, falling back to plain text:', error);
            }
        }

        if (navigator.clipboard) {
            await navigator.clipboard.writeText(plainText);
            return;
        }

        const textArea = document.createElement('textarea');
        textArea.value = plainText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        try {
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
        } finally {
            document.body.removeChild(textArea);
        }
    };

    const createCopyFeedback = (button, icon, duration = 2000) => {
        let timer = null;
        const defaultMarkup = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0l4-4m-4 4l-4-4M5 21h14"></path>';
        const successMarkup = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';

        return () => {
            if (!button) return;
            button.classList.add('success');
            if (icon) icon.innerHTML = successMarkup;
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                button.classList.remove('success');
                if (icon) icon.innerHTML = defaultMarkup;
            }, duration);
        };
    };

    globalScope.ResidentUIUtils = {
        createToast,
        copyText,
        createCopyFeedback
    };
})(window);
