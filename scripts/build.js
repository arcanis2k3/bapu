const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const { globSync } = require('glob');

const TEMPLATES_DIR = 'src/templates';
const ASSETS_DIR = 'src/assets';
const LOCALES_DIR = 'src/locales';
const DIST_DIR = 'dist';

async function build() {
    const localeEntries = await fs.readdir(LOCALES_DIR);
    const langCodes = localeEntries.filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());

    console.log(`Found ${langCodes.length} languages: ${langCodes.join(', ')}`);

    const enTranslationPath = path.join(LOCALES_DIR, 'en', 'translation.json');
    if (!(await fs.pathExists(enTranslationPath))) {
        console.error('English translation file missing. Run extraction first.');
        process.exit(1);
    }
    const enTranslation = await fs.readJson(enTranslationPath);
    const templates = globSync('**/*.html', { cwd: TEMPLATES_DIR });

    console.log(`Processing ${templates.length} templates...`);

    let count = 0;

    for (const lang of langCodes) {
        console.log(`Building for language: ${lang}...`);
        const langTranslationPath = path.join(LOCALES_DIR, lang, 'translation.json');
        const langTranslation = await fs.readJson(langTranslationPath);

        for (const template of templates) {
            const templatePath = path.join(TEMPLATES_DIR, template);
            let html = await fs.readFile(templatePath, 'utf8');

            // 1. Replace {{t('key')}} placeholders
            html = html.replace(/{{t\('(.*?)'\)}}/g, (match, key) => {
                const val = langTranslation[key] || enTranslation[key] || match;
                // Basic HTML escaping for safety
                return val.replace(/[&<>"']/g, char => {
                    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
                    return map[char];
                });
            });

            const dom = new JSDOM(html);
            const doc = dom.window.document;

            // 2. Fix Assets and Localize Internal Links
            doc.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], script[src]').forEach(el => {
                const attr = el.tagName === 'LINK' ? 'href' : 'src';
                const val = el.getAttribute(attr);
                if (val && val.startsWith('/') && !val.startsWith('//')) {
                    if (!val.startsWith('/assets/')) {
                        el.setAttribute(attr, '/assets' + val);
                    }
                }
            });

            doc.querySelectorAll('img[src]').forEach(el => {
                const val = el.getAttribute('src');
                if (val && val.startsWith('/') && !val.startsWith('//') && !val.startsWith('/assets/')) {
                    el.setAttribute('src', '/assets' + val);
                }
            });

            doc.querySelectorAll('a[href]').forEach(el => {
                const val = el.getAttribute('href');
                if (val && (val.startsWith('/') || val.endsWith('.html')) && !val.startsWith('http') && !val.startsWith('mailto:')) {
                    let cleanVal = val.startsWith('/') ? val : '/' + val;
                    if (!cleanVal.startsWith(`/${lang}/`)) {
                        el.setAttribute('href', `/${lang}${cleanVal}`);
                    }
                }
            });

            // 3. Set lang attribute
            doc.documentElement.setAttribute('lang', lang);

            // 4. Inject alternate hreflang tags
            const head = doc.querySelector('head');
            if (head) {
                const defaultLink = doc.createElement('link');
                defaultLink.rel = 'alternate';
                defaultLink.hreflang = 'x-default';
                defaultLink.href = `/en/${template}`;
                head.appendChild(defaultLink);

                for (const l of langCodes) {
                    const altLink = doc.createElement('link');
                    altLink.rel = 'alternate';
                    altLink.hreflang = l;
                    altLink.href = `/${l}/${template}`;
                    head.appendChild(altLink);
                }
            }

            const outDir = path.join(DIST_DIR, lang, path.dirname(template));
            await fs.ensureDir(outDir);
            await fs.writeFile(path.join(outDir, path.basename(template)), dom.serialize(), 'utf8');
            count++;
        }
    }

    // Copy assets to dist/assets
    if (await fs.pathExists(ASSETS_DIR)) {
        await fs.copy(ASSETS_DIR, path.join(DIST_DIR, 'assets'));
        console.log('Assets copied to dist/assets');
    }

    console.log(`Build finished. Created ${count} files.`);
}

build().catch(err => {
    console.error('Build failure:', err);
    process.exit(1);
});
