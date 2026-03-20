const fs = require('fs-extra');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

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

async function translate() {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('Error: ANTHROPIC_API_KEY environment variable is missing.');
        process.exit(1);
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const enTranslation = await fs.readJson(EN_TRANSLATION_PATH);

    for (const lang of LANGUAGES) {
        const langDir = path.join(LOCALES_DIR, lang.code);
        const langFilePath = path.join(langDir, 'translation.json');

        if (await fs.pathExists(langFilePath)) {
            console.log(`Skipping ${lang.name} (${lang.code}), file already exists.`);
            continue;
        }

        console.log(`Translating to ${lang.name} (${lang.code})...`);

        try {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8192,
                system: `You are a professional UI translator. Translate the following JSON string values into ${lang.name}. Keep keys unchanged. Translate values naturally and concisely as they appear in a website UI. Return only valid JSON with no extra text, no markdown, no backticks.`,
                messages: [
                    { role: 'user', content: JSON.stringify(enTranslation) }
                ],
            });

            const translatedJson = JSON.parse(response.content[0].text);
            await fs.ensureDir(langDir);
            await fs.writeJson(langFilePath, translatedJson, { spaces: 2 });
            console.log(`Successfully translated to ${lang.name} (${lang.code}).`);
        } catch (error) {
            console.error(`Error translating to ${lang.name}:`, error);
        }
    }
}

translate().catch(err => {
    console.error(err);
    process.exit(1);
});
