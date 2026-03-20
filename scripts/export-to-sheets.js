const fs = require('fs-extra');
const path = require('path');
const { google } = require('googleapis');

const LOCALES_DIR = 'src/locales';
const CREDENTIALS_PATH = 'config/google-credentials.json';
const SHEET_ID = process.env.SHEET_ID;

async function exportToSheets() {
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
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const langCodes = (await fs.readdir(LOCALES_DIR)).filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());

    // Sort so 'en' is first (Column B)
    const sortedLangs = ['en', ...langCodes.filter(l => l !== 'en')];

    const enTranslation = await fs.readJson(path.join(LOCALES_DIR, 'en', 'translation.json'));
    const keys = Object.keys(enTranslation);

    const rows = [];
    // Header
    const header = ['Key', ...sortedLangs.map(l => l.toUpperCase())];
    rows.push(header);

    for (const key of keys) {
        const row = [key];
        for (const lang of sortedLangs) {
            const langFilePath = path.join(LOCALES_DIR, lang, 'translation.json');
            let val = '';
            if (await fs.pathExists(langFilePath)) {
                const trans = await fs.readJson(langFilePath);
                val = trans[key] || '';
            }
            row.push(val);
        }
        rows.push(row);
    }

    // Update the sheet (overwrite)
    await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: 'Sheet1!A1',
        valueInputOption: 'RAW',
        resource: { values: rows },
    });

    console.log(`Exported ${keys.length} keys to Google Sheet ${SHEET_ID}`);
}

exportToSheets().catch(err => {
    console.error(err);
    process.exit(1);
});
