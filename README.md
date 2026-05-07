# AIoT Greenhouse Management System

Sistema full-stack para monitoreo, análisis y automatización de invernaderos y cultivos hidropónicos.
Integra dispositivos IoT con modelos de Machine Learning para evaluación ambiental en tiempo real y alertas tempranas.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend React/Vite  (puerto 5173)                         │
│  · i18n en/es  · Dashboard  · Zonas  · Cultivos  · Alertas │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API (JWT)
┌──────────────────────────▼──────────────────────────────────┐
│  Spring Boot Backend  (puerto 8080)  ← API PRINCIPAL        │
│  · Spring Security + OAuth2 Gmail                           │
│  · JPA/PostgreSQL  · i18n  · Swagger UI                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP interno
┌──────────────────────────▼──────────────────────────────────┐
│  Flask Microservicio  (puerto 5001)  ← IoT / IA             │
│  · Predicciones ML (RandomForest, SVC, NN)                  │
│  · Simulador IoT  · Lecturas de sensores                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, Vite, react-i18next, Chart.js |
| Backend Principal | Spring Boot 3.3, Spring Security, Spring Data JPA |
| Microservicio IA/IoT | Flask 3.0, scikit-learn, TensorFlow |
| Base de datos | PostgreSQL 16 |
| Autenticación | JWT + OAuth2 Google |
| Documentación API | Springdoc OpenAPI (Swagger UI) |
| Contenedores | Docker, docker-compose |
| CI/CD | GitHub Actions |

---

## Inicio Rápido

### Con Docker Compose (recomendado)

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Google OAuth y JWT secret

# 2. Levantar base de datos
docker compose up -d greenhouse-db

# 3. Iniciar Spring Boot
cd greenhouse_aiot/spring-backend
mvn spring-boot:run

# 4. Iniciar Flask (IoT/AI)
cd greenhouse_aiot/backend
python app.py

# 5. Iniciar Frontend
cd greenhouse_aiot/frontend
npm install && npm run dev
```

### Accesos

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Spring Boot API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| Flask API | http://localhost:5001/apidocs |

---

## Tests

### JUnit (Spring Boot)

```bash
cd greenhouse_aiot/spring-backend
mvn test
```

### pytest (Flask)

```bash
cd greenhouse_aiot/backend
pytest tests/ -v
```

### Selenium (Frontend E2E)

```bash
cd greenhouse_aiot/frontend/tests/selenium
pip install -r requirements.txt
pytest -v --html=report.html
```

---

## Estructura del Proyecto

```
/
├── greenhouse_aiot/
│   ├── spring-backend/          # Backend principal Spring Boot
│   │   ├── src/main/java/com/aiot/greenhouse/
│   │   │   ├── controller/      # REST endpoints
│   │   │   ├── service/         # Lógica de negocio
│   │   │   ├── repository/      # Spring Data JPA
│   │   │   ├── model/           # Entidades JPA
│   │   │   ├── dto/             # DTOs request/response
│   │   │   ├── security/        # JWT, OAuth2, SecurityConfig
│   │   │   ├── config/          # i18n, OpenAPI, RestTemplate
│   │   │   └── exception/       # GlobalExceptionHandler
│   │   └── src/main/resources/
│   │       ├── application.yml
│   │       └── i18n/            # messages.properties (en/es)
│   ├── backend/                 # Microservicio Flask (IoT/IA)
│   │   ├── routes/              # Blueprints Flask
│   │   ├── models/              # SQLAlchemy ORM
│   │   ├── services/            # Predicciones, simulador
│   │   └── tests/               # pytest suite
│   ├── frontend/                # React/Vite
│   │   ├── src/
│   │   │   ├── screens/         # Pantallas principales
│   │   │   ├── i18n/            # Traducciones en.json / es.json
│   │   │   └── api.js           # Cliente HTTP Axios
│   │   └── tests/selenium/      # Tests E2E Selenium
│   └── ai/                      # Modelos ML entrenados
├── .github/workflows/
│   ├── ci.yml                   # CI: build + test + lint
│   └── cd.yml                   # CD: deploy a producción
├── greenhouse_schema.json        # Modelo de datos JSON
├── greenhouse_schema.sql         # DDL PostgreSQL
└── docker-compose.yml
```

---

## API Endpoints Principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/login` | Login con username/password |
| POST | `/api/v1/auth/register` | Registro de usuario |
| GET | `/api/v1/auth/me` | Perfil del usuario autenticado |
| GET | `/api/v1/zones` | Listar zonas activas |
| POST | `/api/v1/zones` | Crear zona (ADMIN) |
| GET | `/api/v1/devices` | Listar dispositivos IoT |
| POST | `/api/v1/readings` | Registrar lectura de sensor |
| GET | `/api/v1/alerts/open` | Alertas pendientes |
| PUT | `/api/v1/alerts/{id}/resolve` | Resolver alerta |
| POST | `/api/v1/predictions/predict` | Solicitar predicción IA |

Documentación completa: **`GET /swagger-ui.html`**

---

## Internacionalización

El backend responde en el idioma indicado por el header `Accept-Language`:

```bash
# Respuesta en español
curl -H "Accept-Language: es" http://localhost:8080/api/v1/zones/999
# {"status":404,"message":"No se encontró la zona con ID: 999"}

# Respuesta en inglés (default)
curl -H "Accept-Language: en" http://localhost:8080/api/v1/zones/999
# {"status":404,"message":"Zone not found with ID: 999"}
```

El frontend usa `react-i18next` con archivos `src/i18n/en.json` y `src/i18n/es.json`.

---

## Conectividad Taiga

El proyecto utiliza **Taiga** para la gestión de historias de usuario y validación de criterios de aceptación.

### Integración GitHub → Taiga

Los commits que referencian una historia de usuario deben incluir el ID de Taiga en el mensaje:

```bash
git commit -m "feat: implement zone CRUD endpoints TG-12"
git commit -m "fix: JWT token expiry validation TG-8"
```

Esto actualiza automáticamente las tarjetas en Taiga via webhook.

### Configurar Webhook

1. En Taiga: **Settings → Integrations → GitHub**
2. Pegar la URL del repositorio
3. Activar eventos: `push`, `pull_request`

### Historias de Usuario Mapeadas

| ID Taiga | Historia | Endpoint / Componente |
|---|---|---|
| TG-1 | Como admin, quiero crear zonas del invernadero | `POST /api/v1/zones` |
| TG-2 | Como operador, quiero registrar dispositivos IoT | `POST /api/v1/devices` |
| TG-3 | Como viewer, quiero ver lecturas de sensores en tiempo real | `GET /api/v1/readings` + Dashboard |
| TG-4 | Como operador, quiero recibir alertas cuando los sensores estén fuera de rango | `GET /api/v1/alerts/open` |
| TG-5 | Como admin, quiero autenticarme con mi cuenta de Gmail | OAuth2 Google → `/api/v1/auth` |
| TG-6 | Como usuario, quiero ver la interfaz en español e inglés | i18n frontend + backend |
| TG-7 | Como admin, quiero ver documentación de la API | Swagger UI `/swagger-ui.html` |
| TG-8 | Como operador, quiero registrar lotes de cultivo | `POST /api/v1/crops` |
| TG-9 | Como admin, quiero solicitar predicciones de IA | `POST /api/v1/predictions/predict` |
| TG-10 | Como admin, quiero que el sistema se despliegue automáticamente | GitHub Actions CI/CD |

---

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
# Spring Boot
DATABASE_URL=jdbc:postgresql://localhost:5432/greenhouse_dev
JWT_SECRET=your-256-bit-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=http://localhost:5173
FLASK_SERVICE_URL=http://localhost:5001
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Flask (IoT/AI microservicio)
FLASK_APP=app.py
AI_MODELS_PATH=../ai/models
DEFAULT_MODEL=random_forest
```

---

## Licencia

MIT — Ver [LICENSE](LICENSE)
