import re

with open('js/lang.js', 'r') as f:
    content = f.read()

# Replace the injection logic in initLanguageSelector
old_logic = """    selectorContainer.appendChild(select);
    footerContent.appendChild(selectorContainer);"""

new_logic = """    selectorContainer.appendChild(select);

    // Find the paragraph containing the links
    const pTags = footerContent.querySelectorAll('p');
    let linksP = null;
    let copyP = null;

    pTags.forEach(p => {
        if (p.querySelector('a')) {
            linksP = p;
        } else if (p.textContent.includes('©')) {
            copyP = p;
        }
    });

    if (linksP) {
        linksP.appendChild(selectorContainer);
    } else {
        footerContent.appendChild(selectorContainer);
    }

    // Move copyright below links
    if (copyP && linksP && copyP.nextElementSibling === linksP) {
        // Swap them so links come first, then copyright
        footerContent.insertBefore(linksP, copyP);
    }"""

content = content.replace(old_logic, new_logic)

with open('js/lang.js', 'w') as f:
    f.write(content)
