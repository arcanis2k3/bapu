from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        base_url = "http://localhost:8081"

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
            page.screenshot(path=f"verification_server_{page_name}.png", full_page=True)

        browser.close()

verify()
