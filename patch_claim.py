import re

with open('claim.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove idroot.org link
content = re.sub(r'<p style="font-size: 0\.9em; color: #8892b0;">Looking for a verified handle\? Check out <a href="https://idroot\.org" target="_blank" style="color: #9fb4ff;">idroot\.org</a></p>\s*', '', content)

# Integrate Bluesky Settings link - Let's see what it looks like exactly right now.
content = content.replace(
    '<li>Open your <a href="https://bsky.app/settings/account" target="_blank"><strong>Bluesky Settings</strong></a>.</li>',
    '<li>Open your <a href="https://bsky.app/settings/account" target="_blank"><strong>account settings in Bluesky</strong></a>.</li>'
)

# Replace dark mode inline styles
content = content.replace('background: #000;', 'background: var(--color-surface, #fff);')
content = content.replace('border: 1px solid #333;', 'border: 1px solid var(--color-border, #E0DCD8);')
content = content.replace('color: #aaa;', 'color: var(--color-text-muted, #736E6A);')

# Also, step-3's h2 uses 'Almost there!', let's ensure it has good color.
content = content.replace('color: #8892b0;', 'color: var(--color-text-muted, #736E6A);') # if any exists

# Also removing "Handles" link from nav/footer in claim.html specifically since we're here.
content = re.sub(r'\s*<a href="/handles\.html"[^>]*>Handles</a>', '', content)

with open('claim.html', 'w', encoding='utf-8') as f:
    f.write(content)
