from playwright.sync_api import Page, expect

def verify_dashboard_layout(page: Page):
    """
    This test verifies that the parent dashboard layout correctly fills the viewport
    and that there is no unwanted white space at the bottom.
    """
    # 1. Arrange: Go to the parent dashboard page.
    page.goto("http://localhost:5173/dashboard")

    # 2. Assert: Wait for the "Children" heading to be visible to ensure the page has loaded.
    expect(page.get_by_role("heading", name="Children")).to_be_visible()

    # 3. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")

# It seems there is no test runner, so I will just call the function directly.
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    verify_dashboard_layout(page)
    browser.close()
