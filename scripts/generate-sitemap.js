const fs = require('fs-extra');
const path = require('path');
const { globSync } = require('glob');

const DIST_DIR = 'dist';
const LOCALES_DIR = 'src/locales';
const BASE_URL = 'https://bapu.app'; // Configurable BASE_URL

async function generateSitemap() {
    const langCodes = (await fs.readdir(LOCALES_DIR)).filter(f => fs.statSync(path.join(LOCALES_DIR, f)).isDirectory());
    const templateFiles = globSync('**/*.html', { cwd: 'src/templates' });
    const today = new Date().toISOString().split('T')[0];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
    sitemap += 'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

    for (const lang of langCodes) {
        for (const file of templateFiles) {
            const pagePath = `/${lang}/${file}`;
            sitemap += '  <url>\n';
            sitemap += `    <loc>${BASE_URL}${pagePath}</loc>\n`;
            sitemap += `    <lastmod>${today}</lastmod>\n`;

            // Add alternate language versions
            for (const altLang of langCodes) {
                sitemap += `    <xhtml:link rel="alternate" hreflang="${altLang}" href="${BASE_URL}/${altLang}/${file}" />\n`;
            }
            // Add x-default
            sitemap += `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/en/${file}" />\n`;

            sitemap += '  </url>\n';
        }
    }

    sitemap += '</urlset>';

    await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
    console.log(`Sitemap generated at ${path.join(DIST_DIR, 'sitemap.xml')}`);
}

generateSitemap().catch(err => {
    console.error(err);
    process.exit(1);
});
