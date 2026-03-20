# BAPU Internationalization & Build System

This repository contains the static BAPU website with a full internationalization (i18n) and build pipeline.

## Project Structure

- `/src/templates/`: HTML source files with i18n placeholders `{{t('key_name')}}`.
- `/src/assets/`: Static assets (CSS, images, JS).
- `/src/locales/`: JSON translation files for each supported language.
- `/scripts/`: Node.js automation scripts.
- `/dist/`: Generated website output (built per language).

## Workflow

To maintain and update the website, follow these steps:

### 1. Extraction
If you've added new text to any HTML template, run the extraction script to sync keys with the English source-of-truth:
```bash
npm run extract
```
This will update `/src/locales/en/translation.json`.

### 2. Auto-Translation
To automatically translate new or missing keys using Claude AI:
```bash
export ANTHROPIC_API_KEY='your-api-key'
npm run translate
```

### 3. Human Review (Optional)
To export current translations to Google Sheets for review or manual correction:
```bash
export SHEET_ID='your-google-sheet-id'
# Ensure config/google-credentials.json exists
npm run export:sheets
```
After editing the sheet, import the changes back:
```bash
npm run import:sheets
```

### 4. Build
To build the localized site to the `/dist/` folder:
```bash
npm run build
```

### 5. Release
To build and generate the sitemap for deployment:
```bash
npm run release
```

## Requirements
- Node.js
- Anthropic API Key (for auto-translation)
- Google Cloud Service Account Credentials (for Google Sheets sync)
