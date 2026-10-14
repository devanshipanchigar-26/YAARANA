
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def test_yaarana_login_page():
    driver = None

    try:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--window-size=1366,768")

        print("Starting Selenium test...", flush=True)

        driver = webdriver.Chrome(options=options)
        driver.get("http://127.0.0.1:5173/login")

        WebDriverWait(driver, 20).until(
            lambda d: d.execute_script(
                "return document.readyState"
            ) == "complete"
        )

        WebDriverWait(driver, 15).until(
            EC.visibility_of_element_located(
                (By.TAG_NAME, "body")
            )
        )

        print("Page title:", driver.title, flush=True)
        print("Current URL:", driver.current_url, flush=True)

        assert "/login" in driver.current_url, (
            "Login page URL is incorrect"
        )

        body_text = driver.find_element(
            By.TAG_NAME, "body"
        ).text.strip()

        assert body_text, "Login page has no visible text"

        print(
            "TEST PASSED: Login page loaded and visible.",
            flush=True
        )

    except Exception as e:
        print("TEST FAILED:", repr(e), flush=True)
        raise

    finally:
        if driver:
            driver.quit()


if __name__ == "__main__":
    test_yaarana_login_page()
