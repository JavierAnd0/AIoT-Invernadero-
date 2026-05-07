"""
Tests Selenium para la gestión de zonas del frontend AIoT Greenhouse.
Verifica listado, creación y navegación a zonas.
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestZones:
    """Suite de tests para la pantalla de Zonas."""

    def test_zones_page_loads(self, authenticated_driver, base_url):
        """La pantalla de gestión de zonas carga correctamente."""
        driver = authenticated_driver
        driver.get(f"{base_url}/zones")

        wait = WebDriverWait(driver, 10)
        page_source = driver.page_source.lower()

        assert any(term in page_source for term in ["zone", "zona"])

    def test_zones_list_displayed(self, authenticated_driver, base_url):
        """La lista de zonas se muestra en la pantalla."""
        driver = authenticated_driver
        driver.get(f"{base_url}/zones")

        wait = WebDriverWait(driver, 10)

        # Espera a que cargue la lista de zonas (tabla o cards)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "table, [data-testid='zone-list'], [class*='zone']")))

    def test_zones_has_create_button(self, authenticated_driver, base_url):
        """Existe un botón para crear nueva zona."""
        driver = authenticated_driver
        driver.get(f"{base_url}/zones")

        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        create_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(text(),'New') or contains(text(),'Create') "
            "or contains(text(),'Nueva') or contains(text(),'Crear') or contains(text(),'+')]"
        )
        assert len(create_buttons) > 0, "No se encontró botón para crear zona"
