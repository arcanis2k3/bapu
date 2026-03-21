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

// Rotating models. Prioritize 3.1-flash-lite (highest limit).
let activeModels = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
];

let modelIndex = 0;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function runGeminiRequest(genAI, langName, chunk) {
    // Try each model until one works
    let attempts = 0;
    while (attempts < activeModels.length) {
        const currentModel = activeModels[modelIndex];
        try {
            const model = genAI.getGenerativeModel({ model: currentModel });
            const systemPrompt = `You are a professional UI translator. Translate the following JSON values into ${langName}. Keep keys unchanged. Return ONLY valid JSON.`;
            const userPrompt = JSON.stringify(chunk);

            const result = await model.generateContent(`${systemPrompt}\n\nJSON:\n${userPrompt}`);
            const response = await result.response;
            const text = response.text();

            const match = text.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('No JSON found');
            return JSON.parse(match[0]);
        } catch (error) {
            console.warn(`Model ${currentModel} failed: ${error.message}`);
            if (error.message.includes('quota') || error.status === 429) {
                console.warn(`Rotating away from ${currentModel} due to rate/quota.`);
            }
            // Move to next model
            modelIndex = (modelIndex + 1) % activeModels.length;
            attempts++;
            await sleep(2000);
        }
    }
    throw new Error('All models failed to translate batch.');
}

async function translate() {
    if (!process.env.GOOGLE_GENAI_API_KEY) {
        console.error('Error: GOOGLE_GENAI_API_KEY environment variable is missing.');
        process.exit(1);
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
    const enTranslation = await fs.readJson(EN_TRANSLATION_PATH);

    for (const lang of LANGUAGES) {
        const langDir = path.join(LOCALES_DIR, lang.code);
        const langFilePath = path.join(langDir, 'translation.json');

        let currentTranslation = {};
        if (await fs.pathExists(langFilePath)) {
            currentTranslation = await fs.readJson(langFilePath);
        }

        const missingKeys = {};
        for (const key of Object.keys(enTranslation)) {
            if (!currentTranslation[key]) {
                missingKeys[key] = enTranslation[key];
            }
        }

        const totalMissing = Object.keys(missingKeys).length;
        if (totalMissing === 0) {
            console.log(`Skipping ${lang.name} (${lang.code}), already fully translated.`);
            continue;
        }

        console.log(`Translating ${totalMissing} keys to ${lang.name} (${lang.code})...`);

        const chunks = chunkObject(missingKeys, 50); // Smaller chunks for better success rate

        for (let j = 0; j < chunks.length; j++) {
            console.log(`  - Batch ${j + 1}/${chunks.length} using ${activeModels[modelIndex]}...`);
            try {
                const translatedPart = await runGeminiRequest(genAI, lang.name, chunks[j]);
                currentTranslation = { ...currentTranslation, ...translatedPart };

                // SAVE AFTER EVERY SUCCESSFUL BATCH
                await fs.ensureDir(langDir);
                await fs.writeJson(langFilePath, currentTranslation, { spaces: 2 });
                console.log(`    - Batch ${j + 1} saved.`);
            } catch (err) {
                console.error(`    - Fatal error in batch ${j + 1}:`, err.message);
                // Continue to next language if this one is stuck
                break;
            }
            await sleep(12000); // 5 RPM safety
        }
    }
}

translate().catch(err => {
    console.error('Fatal translation failure:', err);
    process.exit(1);
});
