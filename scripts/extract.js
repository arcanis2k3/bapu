const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const { globSync } = require('glob');

const TEMPLATES_DIR = 'src/templates';
const LOCALES_DIR = 'src/locales';
const EN_DIR = path.join(LOCALES_DIR, 'en');
const TRANSLATION_FILE = path.join(EN_DIR, 'translation.json');

const BRANDS = ['Bapu', 'ZChat'];
const brandRegex = new RegExp(`(\\b(?:${BRANDS.join('|')})\\b)`, 'gi');

function getSection(el) {
    let current = el;
    while (current) {
        const tag = current.tagName;
        if (tag === 'HEADER' || tag === 'FOOTER' || tag === 'NAV' || tag === 'MAIN') {
            return tag.toLowerCase();
        }
        if (current.id) {
            return current.id.toLowerCase().replace(/[^a-z0-9]/g, '_');
        }
        if (current.className && typeof current.className === 'string') {
            const firstClass = current.className.split(' ')[0];
            if (firstClass && !firstClass.includes('{')) {
                return firstClass.toLowerCase().replace(/[^a-z0-9]/g, '_');
            }
        }
        current = current.parentElement;
    }
    return 'general';
}

const translations = {};

function registerString(pagePrefix, section, text, type) {
    const trimmedText = text.trim();

    // Check if we already have this exact text in this page/section to reuse key
    for (const k in translations) {
        if (translations[k] === trimmedText && k.startsWith(`${pagePrefix}_${section}`)) {
            return k;
        }
    }

    let base = trimmedText
        .replace(/[^a-zA-Z0-9 ]/g, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 5)
        .join('_')
        .toLowerCase();

    if (!base) base = 'text';

    const keyPrefix = `${pagePrefix}_${section}_${type ? type + '_' : ''}${base}`;
    let key = keyPrefix;
    let counter = 1;

    while (translations[key] && translations[key] !== trimmedText) {
        key = `${keyPrefix}_${counter++}`;
    }
    translations[key] = trimmedText;
    return key;
}

function processContent(pagePrefix, el, text, type) {
    if (!text || !text.trim()) return text;

    // If it looks like it's already a placeholder, skip
    if (text.trim().startsWith('{{t(') && text.trim().endsWith(')}}')) return text;

    const section = getSection(el);
    const parts = text.split(brandRegex);
    let result = '';
    let modified = false;

    // Check if there's any non-brand, non-whitespace text
    const nonBrandText = text.replace(brandRegex, '').trim();
    if (!nonBrandText) return text;

    for (const part of parts) {
        if (BRANDS.some(b => part.toLowerCase() === b.toLowerCase())) {
            result += part;
        } else if (part.trim()) {
            const key = registerString(pagePrefix, section, part, type);
            const leading = part.match(/^\s*/)[0];
            const trailing = part.match(/\s*$/)[0];
            result += `${leading}{{t('${key}')}}${trailing}`;
            modified = true;
        } else {
            result += part;
        }
    }
    return modified ? result : text;
}

async function run() {
    const files = globSync('**/*.html', { cwd: TEMPLATES_DIR });

    for (const file of files) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const html = await fs.readFile(filePath, 'utf8');
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const pagePrefix = file.replace(/\.html$/, '').replace(/[\\/]/g, '_');

        // 1. Text Nodes
        const walker = doc.createTreeWalker(doc.body, 4); // NodeFilter.SHOW_TEXT
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            const parentTag = node.parentElement.tagName;
            if (parentTag !== 'SCRIPT' && parentTag !== 'STYLE') {
                nodes.push(node);
            }
        }
        nodes.forEach(n => {
            const oldVal = n.textContent;
            const newVal = processContent(pagePrefix, n.parentElement, oldVal);
            if (newVal !== oldVal) {
                n.textContent = newVal;
            }
        });

        // 2. Attributes
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
            ['alt', 'placeholder', 'aria-label'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) {
                    const newVal = processContent(pagePrefix, el, val, attr);
                    if (newVal !== val) {
                        el.setAttribute(attr, newVal);
                    }
                }
            });
        });

        // 3. Title
        const title = doc.querySelector('title');
        if (title) {
            const oldVal = title.textContent;
            const newVal = processContent(pagePrefix, title, oldVal, 'title');
            if (newVal !== oldVal) {
                title.textContent = newVal;
            }
        }

        // 4. Meta
        const metaSpecs = [
            { selector: 'meta[name="description"]', type: 'meta_desc' },
            { selector: 'meta[property="og:title"]', type: 'og_title' },
            { selector: 'meta[property="og:description"]', type: 'og_desc' }
        ];
        metaSpecs.forEach(spec => {
            const meta = doc.querySelector(spec.selector);
            if (meta) {
                const val = meta.getAttribute('content');
                if (val) {
                    const newVal = processContent(pagePrefix, meta, val, spec.type);
                    if (newVal !== val) {
                        meta.setAttribute('content', newVal);
                    }
                }
            }
        });

        let serialized = dom.serialize();
        // Fix JSDOM escaping single/double quotes in placeholders within attributes
        serialized = serialized.replace(/{{t\(&apos;(.*?)&apos;\)}}/g, "{{t('$1')}}");
        serialized = serialized.replace(/{{t\(&quot;(.*?)&quot;\)}}/g, "{{t('$1')}}");

        await fs.writeFile(filePath, serialized, 'utf8');
    }

    await fs.ensureDir(EN_DIR);
    await fs.writeJson(TRANSLATION_FILE, translations, { spaces: 2 });
    console.log(`Extraction complete. Generated ${Object.keys(translations).length} keys in ${TRANSLATION_FILE}`);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
