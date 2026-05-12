import re

with open('claim.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the fetchDomains function
new_fetch_domains = """async function fetchDomains() {
            try {
                // Hardcode domain to bapu.app as requested, ignoring API response
                const select = document.getElementById('domain');
                select.innerHTML = `<option value="bapu.app">bapu.app</option><option value="custom" disabled>Custom (available soon)</option>`;
            } catch (err) {
                console.error(err);
            }
        }"""

content = re.sub(
    r'async function fetchDomains\(\) \{.*?\n        \}',
    new_fetch_domains,
    content,
    flags=re.DOTALL
)

with open('claim.html', 'w', encoding='utf-8') as f:
    f.write(content)
