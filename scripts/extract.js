const fs = require('fs-extra');
const path = require('path');
const { JSDOM } = require('jsdom');
const { globSync } = require('glob');

const TEMPLATES_DIR = 'src/templates';
const LOCALES_DIR = 'src/locales';
const EN_DIR = path.join(LOCALES_DIR, 'en');
const TRANSLATION_FILE = path.join(EN_DIR, 'translation.json');

const BRANDS = ['Bapu', 'ZChat'];
// Regex to match brands or existing placeholders
const placeholderRegex = /\{\{t\('.*?'\)\}\}/g;
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

let translations = {};

function registerString(pagePrefix, section, text, type) {
    const trimmedText = text.trim();
    // Don't extract placeholders or single punctuation
    if (!trimmedText || trimmedText.match(placeholderRegex) || trimmedText.match(/^[.:,;!?()]+$/)) return null;

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

    const section = getSection(el);

    // Split by placeholders AND brands to preserve them
    const combinedRegex = new RegExp(`(${placeholderRegex.source}|${brandRegex.source})`, 'gi');
    const parts = text.split(combinedRegex);

    let result = '';
    let modified = false;

    for (const part of parts) {
        if (!part) continue;

        const isBrand = BRANDS.some(b => part.toLowerCase() === b.toLowerCase());
        const isPlaceholder = !!part.match(placeholderRegex);

        if (isBrand || isPlaceholder) {
            result += part;
        } else if (part.trim()) {
            const key = registerString(pagePrefix, section, part, type);
            if (key) {
                const leading = part.match(/^\s*/)[0];
                const trailing = part.match(/\s*$/)[0];
                result += `${leading}{{t('${key}')}}${trailing}`;
                modified = true;
            } else {
                result += part;
            }
        } else {
            result += part;
        }
    }
    return modified ? result : text;
}

async function run() {
    // Try to load existing translations first to maintain consistency
    if (await fs.pathExists(TRANSLATION_FILE)) {
        try {
            const existing = await fs.readJson(TRANSLATION_FILE);
            // Filter out any accidentally extracted placeholders from previous runs
            for (const key in existing) {
                if (!existing[key].match(placeholderRegex)) {
                    translations[key] = existing[key];
                }
            }
        } catch (e) {}
    }

    const files = globSync('**/*.html', { cwd: TEMPLATES_DIR });

    for (const file of files) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const html = await fs.readFile(filePath, 'utf8');
        const dom = new JSDOM(html);
        const doc = dom.window.document;
        const pagePrefix = file.replace(/\.html$/, '').replace(/[\\/]/g, '_');

        const walker = doc.createTreeWalker(doc.body || doc.documentElement, 4);
        const nodes = [];
        let node;
        while (node = walker.nextNode()) {
            const parentTag = node.parentElement ? node.parentElement.tagName : '';
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

        const title = doc.querySelector('title');
        if (title) {
            const oldVal = title.textContent;
            const newVal = processContent(pagePrefix, title, oldVal, 'title');
            if (newVal !== oldVal) {
                title.textContent = newVal;
            }
        }

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

        // CRITICAL FIX: Flatten any accidentally nested placeholders like {{t('...{{t('key')}}...')}}
        // This regex finds {{t('some_key_with_nested_t_inside')}} and tries to restore the inner key's value if possible,
        // but it's simpler to just prevent it.
        // The most common case is {{t('key_prefix_{{t('inner_key')}}')}}
        // We will do a recursive replacement to flatten
        let previous;
        do {
            previous = serialized;
            serialized = serialized.replace(/{{t\('[^']*?{{t\('([^']*?)'\)}}[^']*?'\)}}/g, (match, innerKey) => {
                // Return the inner placeholder - this effectively "unwraps" the outer one
                return `{{t('${innerKey}')}}`;
            });
        } while (serialized !== previous);

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
