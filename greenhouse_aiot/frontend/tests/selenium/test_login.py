"""
Tests Selenium para el flujo de autenticación del frontend AIoT Greenhouse.
Verifica: login válido, credenciales inválidas, validación de campos vacíos.
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestLogin:
    """Suite de tests para la pantalla de Login."""

    def test_login_page_renders(self, driver, base_url):
        """La página de login carga y muestra el formulario."""
        driver.get(f"{base_url}/login")

        assert driver.find_element(By.ID, "username").is_displayed()
        assert driver.find_element(By.ID, "password").is_displayed()
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        assert submit_btn.is_displayed()

    def test_login_valid_credentials_redirects_to_dashboard(self, driver, base_url):
        """Login con credenciales válidas redirige al dashboard."""
        driver.get(f"{base_url}/login")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "username")))

        driver.find_element(By.ID, "username").send_keys("admin")
        driver.find_element(By.ID, "password").send_keys("GreenCore2025!")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        wait.until(EC.url_contains("/dashboard"))
        assert "/dashboard" in driver.current_url

    def test_login_invalid_credentials_shows_error(self, driver, base_url):
        """Login con contraseña incorrecta muestra mensaje de error."""
        driver.get(f"{base_url}/login")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "username")))

        driver.find_element(By.ID, "username").send_keys("admin")
        driver.find_element(By.ID, "password").send_keys("wrongpassword")
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # El error debe aparecer en el mismo formulario
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='error-message'], .error, [role='alert']")))
        assert "/dashboard" not in driver.current_url

    def test_login_empty_fields_shows_validation(self, driver, base_url):
        """Intentar login con campos vacíos muestra validación del formulario."""
        driver.get(f"{base_url}/login")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[type='submit']")))

        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

        # Los campos HTML5 required deben impedir el submit
        assert "/login" in driver.current_url

    def test_login_page_has_google_oauth_button(self, driver, base_url):
        """La página de login muestra opción de inicio de sesión con Google."""
        driver.get(f"{base_url}/login")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "username")))

        # Busca botón de Google OAuth (por texto o atributo)
        google_elements = driver.find_elements(
            By.XPATH, "//*[contains(text(),'Google') or contains(@aria-label,'Google')]")
        assert len(google_elements) > 0, "No se encontró el botón de login con Google"
