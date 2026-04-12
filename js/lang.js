const SUPPORTED_LANGUAGES = [
    { code: 'en', flag: '🇬🇧', name: 'English' },
    { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
    { code: 'an', flag: '🇪🇸', name: 'Aragonese' },
    { code: 'ast', flag: '🇪🇸', name: 'Asturian' },
    { code: 'ca', flag: '🇪🇸', name: 'Catalan' },
    { code: 'cy', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', name: 'Welsh' },
    { code: 'da', flag: '🇩🇰', name: 'Danish' },
    { code: 'de', flag: '🇩🇪', name: 'German' },
    { code: 'el', flag: '🇬🇷', name: 'Greek' },
    { code: 'eo', flag: '🟩', name: 'Esperanto' },
    { code: 'es', flag: '🇪🇸', name: 'Spanish' },
    { code: 'eu', flag: '🇪🇸', name: 'Basque' },
    { code: 'fi', flag: '🇫🇮', name: 'Finnish' },
    { code: 'fr', flag: '🇫🇷', name: 'French' },
    { code: 'fy', flag: '🇳🇱', name: 'Frisian' },
    { code: 'ga', flag: '🇮🇪', name: 'Irish' },
    { code: 'gd', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', name: 'Scottish Gaelic' },
    { code: 'gl', flag: '🇪🇸', name: 'Galician' },
    { code: 'hi', flag: '🇮🇳', name: 'Hindi' },
    { code: 'hu', flag: '🇭🇺', name: 'Hungarian' },
    { code: 'ia', flag: '🌐', name: 'Interlingua' },
    { code: 'id', flag: '🇮🇩', name: 'Indonesian' },
    { code: 'it', flag: '🇮🇹', name: 'Italian' },
    { code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { code: 'km', flag: '🇰🇭', name: 'Khmer' },
    { code: 'ko', flag: '🇰🇷', name: 'Korean' },
    { code: 'ne', flag: '🇳🇵', name: 'Nepali' },
    { code: 'nl', flag: '🇳🇱', name: 'Dutch' },
    { code: 'pl', flag: '🇵🇱', name: 'Polish' },
    { code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
    { code: 'ro', flag: '🇷🇴', name: 'Romanian' },
    { code: 'ru', flag: '🇷🇺', name: 'Russian' },
    { code: 'sv', flag: '🇸🇪', name: 'Swedish' },
    { code: 'th', flag: '🇹🇭', name: 'Thai' },
    { code: 'tr', flag: '🇹🇷', name: 'Turkish' },
    { code: 'uk', flag: '🇺🇦', name: 'Ukrainian' },
    { code: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
    { code: 'zh-CN', flag: '🇨🇳', name: 'Simplified Chinese' },
    { code: 'zh-TW', flag: '🇹🇼', name: 'Traditional Chinese' }
];

document.addEventListener('DOMContentLoaded', () => {
    initLanguageSelector();
    detectAndRedirectLanguage();
});

function getPathInfo() {
    const path = window.location.pathname;
    let pathParts = path.split('/').filter(Boolean);
    let currentLang = 'en'; // default

    // Check if the first part or second part is a language code
    // For root files: /es/index.html -> part 0 is 'es'
    // For zchat files: /zchat/es/terms.html -> part 1 is 'es'

    let isZchat = pathParts[0] === 'zchat';
    let langIndex = isZchat ? 1 : 0;

    if (pathParts.length > langIndex) {
        let potentialLang = pathParts[langIndex];
        if (SUPPORTED_LANGUAGES.some(l => l.code === potentialLang)) {
            currentLang = potentialLang;
        }
    }

    // Build the "base" path without the language code
    let basePath = '/';
    if (path === '/') {
        basePath = '/';
    } else {
        let basePathParts = [...pathParts];
        if (currentLang !== 'en') {
            basePathParts.splice(langIndex, 1);
        }
        basePath = '/' + basePathParts.join('/');
    }

    return {
        path: path,
        isZchat: isZchat,
        currentLang: currentLang,
        basePath: basePath
    };
}

function constructLocalizedPath(basePath, isZchat, targetLang) {
    if (targetLang === 'en') {
        return basePath === '' ? '/' : basePath;
    }

    let pathParts = basePath.split('/').filter(Boolean);

    if (isZchat) {
        pathParts.splice(1, 0, targetLang);
    } else {
        pathParts.splice(0, 0, targetLang);
    }

    // Handle root /
    if (pathParts.length === 1 && targetLang === pathParts[0] && !isZchat) {
        return `/${targetLang}/index.html`; // Or '/' if configured that way
    }

    return '/' + pathParts.join('/');
}

function initLanguageSelector() {
    const footerContent = document.querySelector('footer .footer-content');
    if (!footerContent) return;

    const pathInfo = getPathInfo();

    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'lang-selector-container';

    const select = document.createElement('select');
    select.className = 'lang-selector';
    select.setAttribute('aria-label', 'Select Language');

    SUPPORTED_LANGUAGES.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.code;
        option.textContent = `${lang.flag} ${lang.code.toUpperCase()} - ${lang.name}`;
        if (lang.code === pathInfo.currentLang) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', async (e) => {
        const selectedLang = e.target.value;
        localStorage.setItem('preferred_language', selectedLang);

        const pathInfo = getPathInfo();
        if (selectedLang === pathInfo.currentLang) return;

        const targetPath = constructLocalizedPath(pathInfo.basePath, pathInfo.isZchat, selectedLang);

        // Quick HEAD request to check if translated file exists
        if (selectedLang !== 'en') {
            try {
                const response = await fetch(targetPath, { method: 'HEAD' });
                if (response.ok) {
                    window.location.href = targetPath;
                } else {
                    console.warn(`Translation for ${selectedLang} not found at ${targetPath}. Falling back to English.`);
                    // If not en, we redirect to English version
                    window.location.href = constructLocalizedPath(pathInfo.basePath, pathInfo.isZchat, 'en');
                }
            } catch (err) {
                // If fetch fails, just try the redirect and let server handle
                window.location.href = targetPath;
            }
        } else {
             window.location.href = targetPath;
        }
    });

    selectorContainer.appendChild(select);
    footerContent.appendChild(selectorContainer);
}

async function detectAndRedirectLanguage() {
    const pathInfo = getPathInfo();

    // Only detect if we haven't already explicitly set the language in the path
    // or if the user is on the root/english page
    if (pathInfo.currentLang !== 'en') return;

    // Check if we have a saved preference
    let preferredLang = localStorage.getItem('preferred_language');

    if (!preferredLang) {
        // Detect from browser
        const browserLang = navigator.language || navigator.userLanguage;
        // Map language code (e.g. 'en-US' -> 'en', 'es-ES' -> 'es')
        const shortLang = browserLang.split('-')[0];

        // Prefer exact match (zh-CN), then short match (zh)
        const matchedLang = SUPPORTED_LANGUAGES.find(l => l.code === browserLang) ||
                            SUPPORTED_LANGUAGES.find(l => l.code === shortLang);

        if (matchedLang) {
            preferredLang = matchedLang.code;
            // Optionally, we could save it so we don't detect again:
            // localStorage.setItem('preferred_language', preferredLang);
        } else {
            preferredLang = 'en';
        }
    }

    if (preferredLang !== 'en' && preferredLang !== pathInfo.currentLang) {
        const targetPath = constructLocalizedPath(pathInfo.basePath, pathInfo.isZchat, preferredLang);

        // Prevent redirect loops by checking if we already tried this language and failed
        const failedLang = sessionStorage.getItem(`lang_fail_${preferredLang}_${pathInfo.basePath}`);
        if (failedLang) return;

        try {
            const response = await fetch(targetPath, { method: 'HEAD' });
            if (response.ok) {
                window.location.replace(targetPath);
            } else {
                sessionStorage.setItem(`lang_fail_${preferredLang}_${pathInfo.basePath}`, 'true');
            }
        } catch (err) {
            console.error('Error checking language existence', err);
        }
    }
}
