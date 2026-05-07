"""
Tests Selenium para el Dashboard principal del frontend AIoT Greenhouse.
Verifica carga de datos de sensores, widgets y navegación.
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class TestDashboard:
    """Suite de tests para la pantalla del Dashboard."""

    def test_dashboard_renders_after_login(self, authenticated_driver):
        """El dashboard carga correctamente después del login."""
        driver = authenticated_driver
        wait = WebDriverWait(driver, 10)

        # El dashboard debe mostrar al menos un elemento de navegación
        nav_element = wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "nav, [data-testid='nav'], header")))
        assert nav_element.is_displayed()

    def test_dashboard_shows_sensor_data(self, authenticated_driver):
        """El dashboard muestra secciones de datos de sensores."""
        driver = authenticated_driver
        wait = WebDriverWait(driver, 10)

        # Espera a que carguen los datos (puede ser un spinner primero)
        wait.until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[data-testid='sensor-card'], .sensor, [class*='sensor']")))

    def test_dashboard_navigation_links_present(self, authenticated_driver):
        """La navegación del dashboard incluye los módulos principales."""
        driver = authenticated_driver

        page_source = driver.page_source.lower()

        # Verifica que los módulos principales estén referenciados en la página
        assert any(term in page_source for term in ["sensor", "sensors", "sensores"])
        assert any(term in page_source for term in ["zone", "zones", "zona"])
        assert any(term in page_source for term in ["alert", "alerts", "alerta"])

    def test_dashboard_language_switch(self, authenticated_driver):
        """El selector de idioma está disponible en el dashboard."""
        driver = authenticated_driver

        # Busca el selector de idioma
        lang_selectors = driver.find_elements(
            By.XPATH,
            "//*[contains(@aria-label,'language') or contains(@aria-label,'idioma') "
            "or contains(text(),'EN') or contains(text(),'ES')]"
        )
        assert len(lang_selectors) > 0, "No se encontró el selector de idioma"
