with open('style.css', 'r') as f:
    content = f.read()

# Replace block
old_block = """.lang-selector-container {
  margin-top: 20px;
  display: inline-block;
}"""

new_block = """.lang-selector-container {
  display: inline-block;
  margin-left: 10px;
  vertical-align: middle;
}"""

content = content.replace(old_block, new_block)

with open('style.css', 'w') as f:
    f.write(content)
