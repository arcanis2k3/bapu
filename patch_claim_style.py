import re

with open('claim.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Make the container and text elements match the light theme
content = content.replace('background: #151515;', 'background: var(--color-surface, #fff);')
content = content.replace('color: #fff;', 'color: var(--color-text, #3A3532);')
content = content.replace('color: #ccc;', 'color: var(--color-text-muted, #736E6A);')
content = content.replace('color: #ddd;', 'color: var(--color-text, #3A3532);')

# Input fields
content = content.replace('background: #222;', 'background: var(--color-bg, #F7F5F3);')
content = content.replace('border: 1px solid #444;', 'border: 1px solid var(--color-border, #E0DCD8);')

# Button colors - map to primary
content = content.replace('background: #007bff;', 'background: var(--color-primary, #E07B54);')
content = content.replace('border-color: #007bff;', 'border-color: var(--color-primary, #E07B54);')
content = content.replace('button:hover { background: #0056b3; }', 'button:hover { background: #C86946; }')
content = content.replace('button:disabled { background: #555; cursor: not-allowed; }', 'button:disabled { background: var(--color-text-muted, #736E6A); cursor: not-allowed; opacity: 0.7; }')

# Active step left border
content = content.replace('border-left: 4px solid #007bff;', 'border-left: 4px solid var(--color-primary, #E07B54);')

# Error box
# Leave it red, but maybe a bit softer
# content = content.replace('color: #ff4d4d;', 'color: #D32F2F;')
# content = content.replace('border: 1px solid #ff4d4d;', 'border: 1px solid #D32F2F;')
# content = content.replace('background: rgba(255, 77, 77, 0.1);', 'background: rgba(211, 47, 47, 0.1);')

with open('claim.html', 'w', encoding='utf-8') as f:
    f.write(content)
