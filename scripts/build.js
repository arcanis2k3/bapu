const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const { globSync } = require('glob');

const TEMPLATES_DIR = 'src/templates';
const ASSETS_DIR = 'src/assets';
const LOCALES_DIR = 'src/locales';
const DIST_DIR = 'dist';

async function build() {
    const langCodes = (await fs.readdir(LOCALES_DIR)).filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());
    const enTranslation = await fs.readJson(path.join(LOCALES_DIR, 'en', 'translation.json'));
    const templates = globSync('**/*.html', { cwd: TEMPLATES_DIR });

    let count = 0;

    for (const lang of langCodes) {
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
            // - Fix stylesheets, icons, and scripts
            doc.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], script[src]').forEach(el => {
                const attr = el.tagName === 'LINK' ? 'href' : 'src';
                const val = el.getAttribute(attr);
                if (val && val.startsWith('/') && !val.startsWith('//')) {
                    // Prepend /assets/ to asset paths if missing
                    if (!val.startsWith('/assets/')) {
                        el.setAttribute(attr, '/assets' + val);
                    }
                }
            });

            // - Fix images
            doc.querySelectorAll('img[src]').forEach(el => {
                const val = el.getAttribute('src');
                if (val && val.startsWith('/') && !val.startsWith('//') && !val.startsWith('/assets/')) {
                    el.setAttribute('src', '/assets' + val);
                }
            });

            // - Localize internal anchor links
            doc.querySelectorAll('a[href]').forEach(el => {
                const val = el.getAttribute('href');
                if (val && (val.startsWith('/') || val.endsWith('.html')) && !val.startsWith('http') && !val.startsWith('mailto:')) {
                    // Handle relative paths and root-relative paths
                    let cleanVal = val.startsWith('/') ? val : '/' + val;
                    // If not already localized
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
                // x-default (English)
                const defaultLink = doc.createElement('link');
                defaultLink.rel = 'alternate';
                defaultLink.hreflang = 'x-default';
                defaultLink.href = `/en/${template}`;
                head.appendChild(defaultLink);

                // All language variants
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
    }

    console.log(`Build complete. Generated ${count} pages (${templates.length} templates × ${langCodes.length} languages).`);
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
