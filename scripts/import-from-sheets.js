const fs = require('fs-extra');
const path = require('path');
const { google } = require('googleapis');

const LOCALES_DIR = 'src/locales';
const CREDENTIALS_PATH = 'config/google-credentials.json';
const SHEET_ID = process.env.SHEET_ID;

async function importFromSheets() {
    if (!SHEET_ID) {
        console.error('Error: SHEET_ID environment variable is missing.');
        process.exit(1);
    }

    if (!(await fs.pathExists(CREDENTIALS_PATH))) {
        console.error(`Error: Google credentials not found at ${CREDENTIALS_PATH}`);
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A1:ZZ', // Fetch everything
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found in the sheet.');
        return;
    }

    const header = rows[0];
    const languages = header.slice(1).map(l => l.toLowerCase());
    const translationsByLang = {};

    languages.forEach(lang => {
        translationsByLang[lang] = {};
    });

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const key = row[0];
        for (let j = 0; j < languages.length; j++) {
            const val = row[j + 1];
            if (val !== undefined && val !== null) {
                translationsByLang[languages[j]][key] = val;
            }
        }
    }

    for (const lang of Object.keys(translationsByLang)) {
        const langDir = path.join(LOCALES_DIR, lang);
        await fs.ensureDir(langDir);
        await fs.writeJson(path.join(langDir, 'translation.json'), translationsByLang[lang], { spaces: 2 });
        console.log(`Imported ${Object.keys(translationsByLang[lang]).length} keys for language ${lang}`);
    }
}

importFromSheets().catch(err => {
    console.error(err);
    process.exit(1);
});
