import os
import glob

# Try to import bs4, if not just strip HTML
try:
    from bs4 import BeautifulSoup
except ImportError:
    import sys
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
    from bs4 import BeautifulSoup

def extract_text(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), "html.parser")

        main_tag = soup.find('main')
        if not main_tag:
            main_tag = soup.find('body')

        if not main_tag:
            return ""

        # Extract text, separate blocks with newlines
        lines = []
        for string in main_tag.stripped_strings:
            lines.append(string)
        return "\n".join(lines)

html_files = [
    'index.html', 'about.html', 'handles.html', 'signup.html',
    'community.html', 'privacy.html', 'terms.html',
    'zchat/privacy.html', 'zchat/terms.html'
]

with open('llms.txt', 'w', encoding='utf-8') as out:
    out.write("# BAPU Website & Knowledge Base\n\n")

    for html_file in html_files:
        if os.path.exists(html_file):
            title = html_file.replace('.html', '').replace('/', ' - ').upper()
            out.write(f"\n\n{'='*40}\n")
            out.write(f"## {title}\n")
            out.write(f"{'='*40}\n\n")
            text = extract_text(html_file)
            out.write(text)

print("Generated llms.txt")
