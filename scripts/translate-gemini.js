const fs = require('fs-extra');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const LOCALES_DIR = 'src/locales';
const EN_TRANSLATION_PATH = path.join(LOCALES_DIR, 'en', 'translation.json');

const LANGUAGES = [
    { name: 'Arabic', code: 'ar' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Chinese (Simplified)', code: 'zh-Hans' },
    { name: 'Chinese (Traditional)', code: 'zh-Hant' },
    { name: 'Czech', code: 'cs' },
    { name: 'Dutch', code: 'nl' },
    { name: 'Finnish', code: 'fi' },
    { name: 'French', code: 'fr' },
    { name: 'German', code: 'de' },
    { name: 'Greek', code: 'el' },
    { name: 'Hebrew', code: 'he' },
    { name: 'Hindi', code: 'hi' },
    { name: 'Hungarian', code: 'hu' },
    { name: 'Indonesian', code: 'id' },
    { name: 'Italian', code: 'it' },
    { name: 'Japanese', code: 'ja' },
    { name: 'Korean', code: 'ko' },
    { name: 'Malay', code: 'ms' },
    { name: 'Norwegian', code: 'no' },
    { name: 'Persian', code: 'fa' },
    { name: 'Polish', code: 'pl' },
    { name: 'Portuguese (Brazil)', code: 'pt-BR' },
    { name: 'Portuguese (Portugal)', code: 'pt-PT' },
    { name: 'Romanian', code: 'ro' },
    { name: 'Russian', code: 'ru' },
    { name: 'Spanish (Latin America)', code: 'es-419' },
    { name: 'Spanish (Spain)', code: 'es-ES' },
    { name: 'Swahili', code: 'sw' },
    { name: 'Swedish', code: 'sv' },
    { name: 'Tagalog', code: 'tl' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Thai', code: 'th' },
    { name: 'Turkish', code: 'tr' },
    { name: 'Ukrainian', code: 'uk' },
    { name: 'Urdu', code: 'ur' },
    { name: 'Vietnamese', code: 'vi' }
];

// Requested model rotation list
const MODELS = [
    'gemini-2.5-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-lite'
];

let modelIndex = 0;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithRetry(fn, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (error.status === 429) {
                const delay = (i + 1) * 30000;
                console.warn(`Rate limit hit (429) on ${MODELS[modelIndex]}. Retrying in ${delay / 1000}s...`);
                await sleep(delay);
                // Rotate model on rate limit
                modelIndex = (modelIndex + 1) % MODELS.length;
            } else {
                console.error(`Request failed on ${MODELS[modelIndex]}: ${error.message}`);
                // Try rotating model even on other errors
                modelIndex = (modelIndex + 1) % MODELS.length;
                await sleep(5000);
            }
        }
    }
    throw lastError;
}

function chunkObject(obj, size) {
    const keys = Object.keys(obj);
    const chunks = [];
    for (let i = 0; i < keys.length; i += size) {
        const chunk = {};
        keys.slice(i, i + size).forEach(k => chunk[k] = obj[k]);
        chunks.push(chunk);
    }
    return chunks;
}

async function translate() {
    if (!process.env.GOOGLE_GENAI_API_KEY) {
        console.error('Error: GOOGLE_GENAI_API_KEY environment variable is missing.');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const enTranslation = await fs.readJson(EN_TRANSLATION_PATH);

    for (let i = 0; i < LANGUAGES.length; i++) {
        const lang = LANGUAGES[i];
        const langDir = path.join(LOCALES_DIR, lang.code);
        const langFilePath = path.join(langDir, 'translation.json');

        let existingTranslation = {};
        if (await fs.pathExists(langFilePath)) {
            existingTranslation = await fs.readJson(langFilePath);
        }

        const missingKeys = {};
        for (const key of Object.keys(enTranslation)) {
            if (!existingTranslation[key]) {
                missingKeys[key] = enTranslation[key];
            }
        }

        const totalMissing = Object.keys(missingKeys).length;
        if (totalMissing === 0) {
            console.log(`Skipping ${lang.name} (${lang.code}), already fully translated.`);
            continue;
        }

        console.log(`Translating ${totalMissing} keys to ${lang.name} (${lang.code})...`);

        const chunks = chunkObject(missingKeys, 30);
        let currentTranslation = { ...existingTranslation };

        for (let j = 0; j < chunks.length; j++) {
            const chunk = chunks[j];
            console.log(`  - Processing batch ${j + 1}/${chunks.length} using ${MODELS[modelIndex]}...`);

            try {
                const translatedPart = await callWithRetry(async () => {
                    const model = genAI.getGenerativeModel({ model: MODELS[modelIndex] });
                    const systemPrompt = `You are a professional UI translator. Translate the following JSON values into ${lang.name}. Keep keys unchanged. Return ONLY valid JSON.`;
                    const userPrompt = JSON.stringify(chunk);

                    const result = await model.generateContent(`${systemPrompt}\n\nJSON:\n${userPrompt}`);
                    const response = await result.response;
                    let text = response.text();
                    text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
                    return JSON.parse(text);
                });

                currentTranslation = { ...currentTranslation, ...translatedPart };
                await fs.ensureDir(langDir);
                await fs.writeJson(langFilePath, currentTranslation, { spaces: 2 });
            } catch (err) {
                console.error(`Failed to translate batch ${j + 1} for ${lang.name}:`, err.message);
            }

            // Respect RPM limits
            await sleep(15000);
        }

        console.log(`Successfully updated ${lang.name} (${lang.code}).`);
    }
}

translate().catch(err => {
    console.error('Fatal error during translation:', err);
    process.exit(1);
});
