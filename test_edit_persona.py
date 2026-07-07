from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        # 1. Edit test
        page.goto("http://localhost:3001")
        time.sleep(3)
        
        # Try to open sidebar if it is closed (hamburger menu is often just a button with SVG, let's try finding it)
        try:
            # In mobile it might be closed. In desktop it might be open.
            page.locator("text=Personas").wait_for(timeout=2000)
        except:
            # If not visible, click the first button which is usually the hamburger menu
            page.locator("button").first.click()
            time.sleep(1)
        
        # Click "Personas" tab
        page.locator("text=Personas").click()
        time.sleep(1)
        
        # Click "Editar"
        page.locator("button", has_text="Editar").first.click()
        time.sleep(1)
        page.screenshot(path="edit_modal_open.png")
        
        # Change prompt
        # The prompt textarea is the second textarea when editing (first is description which is hidden, but wait, when editing, description is not rendered! So it's the first textarea!)
        page.locator("textarea").first.fill("Novo prompt testado e modificado pelo agent")
        page.locator("text=Salvar Persona").click()
        time.sleep(2)
        page.screenshot(path="edit_modal_saved.png")
        
        browser.close()

if __name__ == "__main__":
    run()
