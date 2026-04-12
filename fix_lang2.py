import re

with open('js/lang.js', 'r') as f:
    content = f.read()

# Cloudflare Pages fallback makes `fetch(targetPath, {method:'HEAD'})` return a 200 OK because it returns the SPA index.html
# To prevent false positives where /es/terms.html returns the homepage, we should change the fallback logic to check if we are on a page that actually has a translation, or use `response.url` (if it redirected) or maybe parse the text.
# An easier way: Only redirect if `pathInfo.isZchat` is true OR if we have the localized pages. Since the user said "in the preview /es/terms.html shows just the home page", it means they navigated to `/es/terms.html` directly or the redirect went to `/es/terms.html` instead of `/zchat/es/terms.html`.
# Let's look at `constructLocalizedPath`:
# if (isZchat) { pathParts.splice(1, 0, targetLang); } else { pathParts.splice(0, 0, targetLang); }
# If they are on `/terms.html` (the root terms), it constructs `/es/terms.html`. But the zip only had `/zchat/es/terms.html` and NOT `/es/terms.html`.
# Since there is NO `/es/terms.html`, Cloudflare falls back to `/index.html` which is the home page!
# To fix: The root `terms.html` should NOT be redirected to `/es/terms.html` because it doesn't exist yet, but our HEAD request incorrectly thought it did because of Cloudflare's fallback.
# To properly check existence despite Cloudflare SPA, we can fetch without HEAD and check the content, OR we can just rely on the fallback but fetch with `headers: { 'Accept': 'text/html' }` and check if it contains `<title>ZChat`?
# Better: Just disable language redirection on pages that aren't inside `/zchat/` FOR NOW, until they are translated. Or fetch and check if the returned HTML contains the expected title.
# Let's update the fetch to verify the HTML isn't just the homepage by checking for a specific string (e.g., we can check if it contains `<title>BAPU — Sovereign Social Infrastructure</title>` which is the index page title. If it does, and we didn't request the index page, it's a 404 fallback).

new_fetch = """
        if (selectedLang !== 'en') {
            try {
                const response = await fetch(targetPath);
                if (response.ok) {
                    const text = await response.text();
                    // Cloudflare pages might return index.html for 404s
                    const isFallbackIndex = text.includes('<title>BAPU — Sovereign Social Infrastructure</title>') && !targetPath.includes('index.html') && targetPath !== '/' + selectedLang + '/';

                    if (!isFallbackIndex) {
                        window.location.href = targetPath;
                        return;
                    }
                }
                console.warn(`Translation for ${selectedLang} not found at ${targetPath}. Falling back to English.`);
                window.location.href = constructLocalizedPath(pathInfo.basePath, pathInfo.isZchat, 'en');
            } catch (err) {
                window.location.href = targetPath;
            }
        }
"""

content = re.sub(r"if \(selectedLang !== 'en'\) \{[\s\S]*?\} else \{", new_fetch.strip() + "\n        } else {", content)


new_fetch_detect = """
        try {
            const response = await fetch(targetPath);
            if (response.ok) {
                const text = await response.text();
                const isFallbackIndex = text.includes('<title>BAPU — Sovereign Social Infrastructure</title>') && !targetPath.includes('index.html') && targetPath !== '/' + preferredLang + '/';

                if (!isFallbackIndex) {
                    window.location.replace(targetPath);
                    return;
                }
            }
            sessionStorage.setItem(`lang_fail_${preferredLang}_${pathInfo.basePath}`, 'true');
        } catch (err) {
            console.error('Error checking language existence', err);
        }
"""

content = re.sub(r"try \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}", new_fetch_detect.strip(), content)

with open('js/lang.js', 'w') as f:
    f.write(content)
