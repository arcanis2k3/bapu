with open('status.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to carefully remove the last three services from the list.
# The `services = [` array contains them.

services_part = content.split('const services = [')[1].split('];')[0]

# Let's rebuild the content by replacing the `services = [...]` completely
import re

new_content = re.sub(
    r"\{\s*name:\s*'zchat\.bapu\.app',\s*check:\s*async\s*\(\)\s*=>\s*\{\s*// Frontends signup is not working\s*return\s*\{\s*status:\s*'yellow',\s*version:\s*''\s*\};\s*\}\s*\},",
    "",
    content
)

new_content = re.sub(
    r"\{\s*name:\s*'web\.bapu\.app',\s*check:\s*async\s*\(\)\s*=>\s*\{\s*// Frontends signup is not working\s*return\s*\{\s*status:\s*'yellow',\s*version:\s*''\s*\};\s*\}\s*\},",
    "",
    new_content
)

new_content = re.sub(
    r"\{\s*name:\s*'encryption\.bapu\.app',\s*check:\s*async\s*\(\)\s*=>\s*\{\s*// Frontends signup is not working\s*return\s*\{\s*status:\s*'yellow',\s*version:\s*''\s*\};\s*\}\s*\}",
    "",
    new_content
)

with open('status.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
