import asyncio
import http.server
import socketserver
import threading
from playwright.async_api import async_playwright

PORT = 8081
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()

async def main():
    # Start the server in a separate thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait for the server to start
    await asyncio.sleep(2)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Capture spaces.html
        await page.goto(f"http://localhost:{PORT}/spaces.html")
        await page.screenshot(path="verification_new_spaces.html.png", full_page=True)
        print("Captured verification_new_spaces.html.png")

        # Capture rooms.html
        await page.goto(f"http://localhost:{PORT}/rooms.html")
        await page.screenshot(path="verification_rooms.html.png", full_page=True)
        print("Captured verification_rooms.html.png")

        # Capture bubbles.html
        await page.goto(f"http://localhost:{PORT}/bubbles.html")
        await page.screenshot(path="verification_bubbles.html.png", full_page=True)
        print("Captured verification_bubbles.html.png")

        # Capture circles.html
        await page.goto(f"http://localhost:{PORT}/circles.html")
        await page.screenshot(path="verification_circles.html.png", full_page=True)
        print("Captured verification_circles.html.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())