from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Assuming we can load files locally
        import os
        base_url = f"file://{os.path.abspath('.')}"

        pages_to_check = [
            "spaces.html",
            "communities.html",
            "monetize.html",
            "foryoureyesonly.html",
            "encrypted.html",
            "algorithms.html"
        ]

        for page_name in pages_to_check:
            url = f"{base_url}/{page_name}"
            print(f"Checking {url}")
            page.goto(url)
            page.screenshot(path=f"verification_{page_name}.png", full_page=True)

        browser.close()

verify()
