"""
Fixtures de pytest para tests Selenium del frontend AIoT Greenhouse.
Configura ChromeDriver en modo headless para CI/CD.
"""
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


BASE_URL = os.getenv("SELENIUM_BASE_URL", "http://localhost:5173")
ADMIN_USERNAME = os.getenv("TEST_ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "GreenCore2025!")


@pytest.fixture(scope="session")
def base_url():
    """URL base del frontend en entorno de prueba."""
    return BASE_URL


@pytest.fixture(scope="function")
def driver():
    """WebDriver con Chrome en modo headless. Se cierra después de cada test."""
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280,720")

    # selenium-manager (built into Selenium 4.6+) downloads the correct
    # ChromeDriver automatically — no need for webdriver-manager.
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)

    yield driver

    driver.quit()


@pytest.fixture(scope="function")
def authenticated_driver(driver, base_url):
    """Driver pre-autenticado como admin para tests que requieren login."""
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC

    driver.get(f"{base_url}/login")

    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.ID, "username")))

    driver.find_element(By.ID, "username").send_keys(ADMIN_USERNAME)
    driver.find_element(By.ID, "password").send_keys(ADMIN_PASSWORD)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    wait.until(EC.url_contains("/dashboard"))

    return driver
