---
layout: default
lang: es
title: Documentación de pruebas del backend
---

# ChordMe Backend - Documentación de pruebas automatizadas

Este documento proporciona documentación integral para las pruebas automatizadas implementadas para el sistema de autenticación del backend de ChordMe.

## Resumen

La suite de pruebas cubre todos los endpoints de autenticación de usuarios incluyendo registro, inicio de sesión y funcionalidad de verificación de salud. Las pruebas están implementadas usando pytest y pytest-flask, proporcionando cobertura integral tanto de escenarios de ruta feliz como de casos límite.

## Estructura de pruebas

### Organización de pruebas

La suite de pruebas está organizada en las siguientes clases de prueba:

1. **TestHealthEndpoint** - Pruebas del endpoint de verificación de salud
2. **TestUserRegistration** - Pruebas del endpoint de registro de usuarios  
3. **TestUserLogin** - Pruebas del endpoint de inicio de sesión de usuarios
4. **TestIntegrationScenarios** - Pruebas de integración de extremo a extremo

### Configuración de pruebas

Las pruebas usan una base de datos SQLite aislada en memoria para asegurar:
- Ejecución rápida de pruebas
- Sin interferencia entre pruebas
- Sin impacto en datos de desarrollo o producción
- Aislamiento completo entre ejecuciones de pruebas

## Categorías de pruebas

### Pruebas de verificación de salud

**Endpoint**: `GET /api/v1/health`

- **test_health_check**: Verifica que el endpoint de salud devuelve el estado y mensaje correctos

### Pruebas de registro de usuarios

**Endpoint**: `POST /api/v1/auth/register`

#### Pruebas de ruta feliz
- **test_successful_registration**: Registro válido con email y contraseña apropiados
- **test_registration_with_multiple_valid_users**: Múltiples usuarios pueden registrarse con diferentes datos válidos
- **test_registration_email_normalization**: Las direcciones de email se normalizan a minúsculas

#### Pruebas de validación
- **test_registration_missing_email**: El registro falla cuando falta el email
- **test_registration_missing_password**: El registro falla cuando falta la contraseña
- **test_registration_invalid_emails**: El registro falla con varios formatos de email inválidos:
  - Cadena vacía
  - Formatos inválidos (sin @, sin dominio, etc.)
  - Emails que exceden la longitud máxima (120 caracteres)
- **test_registration_invalid_passwords**: El registro falla con contraseñas débiles:
  - Muy corta (< 8 caracteres)
  - Muy larga (> 128 caracteres)
  - Sin letras mayúsculas
  - Sin letras minúsculas
  - Sin números

#### Pruebas de manejo de errores
- **test_registration_no_data**: El registro falla cuando no se proporcionan datos
- **test_registration_empty_json**: El registro falla con payload JSON vacío
- **test_registration_duplicate_email**: El registro falla cuando el email ya existe
- **test_registration_duplicate_email_case_insensitive**: La detección de duplicados no distingue entre mayúsculas y minúsculas

### Pruebas de inicio de sesión de usuarios

**Endpoint**: `POST /api/v1/auth/login`

#### Pruebas de ruta feliz
- **test_successful_login**: Inicio de sesión válido devuelve token JWT y datos de usuario
- **test_login_jwt_token_validity**: Los tokens JWT generados son válidos y contienen las reclamaciones esperadas
- **test_login_email_normalization**: El inicio de sesión funciona con diferentes casos de email

#### Pruebas de validación
- **test_login_missing_email**: El inicio de sesión falla cuando falta el email
- **test_login_missing_password**: El inicio de sesión falla cuando falta la contraseña
- **test_login_empty_email**: El inicio de sesión falla con cadena de email vacía
- **test_login_empty_password**: El inicio de sesión falla con cadena de contraseña vacía

#### Pruebas de autenticación
- **test_login_invalid_email**: El inicio de sesión falla con email inexistente
- **test_login_invalid_password**: El inicio de sesión falla con contraseña incorrecta

#### Pruebas de manejo de errores
- **test_login_no_data**: El inicio de sesión falla cuando no se proporcionan datos
- **test_login_empty_json**: El inicio de sesión falla con payload JSON vacío

### Pruebas de integración

#### Escenarios de extremo a extremo
- **test_register_and_login_flow**: Recorrido completo del usuario desde registro hasta inicio de sesión
- **test_multiple_users_registration_and_login**: Múltiples usuarios pueden registrarse e iniciar sesión independientemente

## Datos de prueba y fixtures

### Fixtures

- **client**: Cliente de prueba Flask con base de datos en memoria
- **sample_user_data**: Datos de usuario válidos para pruebas básicas
- **invalid_emails**: Colección de formatos de email inválidos para pruebas de validación
- **invalid_passwords**: Colección de contraseñas débiles para pruebas de validación
- **valid_user_variations**: Múltiples conjuntos de datos de usuario válidos para pruebas integrales

### Patrones de datos de prueba

**Formatos de email válidos**:
- user@example.com
- test.user@domain.co.uk
- user1@test.org

**Formatos de email inválidos**:
- Cadenas vacías
- Sin símbolo @
- Sin dominio
- Sin TLD
- Emails que exceden límites de longitud

**Requisitos de contraseña válida**:
- Mínimo 8 caracteres
- Máximo 128 caracteres
- Al menos una letra mayúscula
- Al menos una letra minúscula
- Al menos un dígito

## Ejecutar pruebas

### Prerrequisitos

Instalar dependencias requeridas:
```bash
pip install flask flask-cors flask-sqlalchemy bcrypt pyjwt pytest pytest-flask
```

### Ejecutar todas las pruebas

```bash
# Desde el directorio backend
python -m pytest tests/

# Con salida verbosa
python -m pytest tests/ -v

# Con reporte de cobertura (si coverage está instalado)
python -m pytest tests/ --cov=chordme
```

### Ejecutar categorías específicas de pruebas

```bash
# Pruebas del endpoint de salud
python -m pytest tests/test_auth.py::TestHealthEndpoint -v

# Pruebas de registro
python -m pytest tests/test_auth.py::TestUserRegistration -v

# Pruebas de inicio de sesión
python -m pytest tests/test_auth.py::TestUserLogin -v

# Pruebas de integración
python -m pytest tests/test_auth.py::TestIntegrationScenarios -v
```

### Ejecutar pruebas individuales

```bash
# Método de prueba específico
python -m pytest tests/test_auth.py::TestUserRegistration::test_successful_registration -v
```

## Interpretación de resultados de pruebas

### Ejecución exitosa de pruebas

```
tests/test_auth.py::TestHealthEndpoint::test_health_check PASSED
tests/test_auth.py::TestUserRegistration::test_successful_registration PASSED
tests/test_auth.py::TestUserLogin::test_successful_login PASSED
...
25 passed in 6.64s
```

### Fallas de pruebas

Cuando las pruebas fallan, pytest proporciona información detallada de error incluyendo:
- Valores esperados vs valores reales
- Datos de petición/respuesta
- Trazas de pila para depuración

## Validación de comportamiento de la API

### Comportamiento del endpoint de registro

**Respuesta de registro válido (201)**:
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-01T12:00:00.000000",
    "updated_at": "2024-01-01T12:00:00.000000"
  }
}
```

**Respuesta de error de registro (400/409)**:
```json
{
  "status": "error",
  "error": "Error message description"
}
```

### Comportamiento del endpoint de inicio de sesión

**Respuesta de inicio de sesión válido (200)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "created_at": "2024-01-01T12:00:00.000000",
      "updated_at": "2024-01-01T12:00:00.000000"
    }
  }
}
```

**Respuesta de error de inicio de sesión (400/401)**:
```json
{
  "status": "error",
  "error": "Error message description"
}
```

## Validación de seguridad

La suite de pruebas valida varias medidas de seguridad:

1. **Hash de contraseñas**: Las contraseñas nunca se devuelven en las respuestas
2. **Normalización de email**: Los emails se convierten a minúsculas para prevenir cuentas duplicadas
3. **Seguridad de tokens JWT**: Los tokens contienen reclamaciones y expiración apropiadas
4. **Validación de entrada**: Todas las entradas se validan apropiadamente antes del procesamiento
5. **Mensajes de error**: Mensajes de error genéricos previenen la enumeración de usuarios

## Extender la suite de pruebas

### Agregar nuevas pruebas

Para agregar nuevos casos de prueba:

1. Crear métodos de prueba siguiendo la convención de nomenclatura `test_*`
2. Usar la clase de prueba apropiada basada en funcionalidad
3. Incluir docstrings describiendo el propósito de la prueba
4. Usar fixtures para datos de prueba comunes
5. Seguir los patrones de aserción existentes

### Ejemplo de nueva prueba

```python
def test_registration_custom_scenario(self, client):
    """Probar registro con lógica de negocio específica."""
    # Organizar
    user_data = {'email': 'test@example.com', 'password': 'CustomPass123'}
    
    # Actuar
    response = client.post(
        '/api/v1/auth/register',
        json=user_data,
        content_type='application/json'
    )
    
    # Afirmar
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['status'] == 'success'
    # Aserciones adicionales...
```

## Integración continua

Estas pruebas están diseñadas para ejecutarse en pipelines de CI/CD:

- Ejecución rápida (< 10 segundos para toda la suite)
- Sin dependencias externas
- Resultados determinísticos
- Indicadores claros de éxito/fallo
- Reporte detallado de errores

## Solución de problemas

### Problemas comunes

1. **Errores de importación**: Asegurar que el directorio backend esté en el path de Python
2. **Errores de base de datos**: Las pruebas usan base de datos en memoria, no se requiere configuración
3. **Problemas de dependencias**: Instalar todos los paquetes requeridos como se lista en prerrequisitos

### Modo de depuración

Ejecutar pruebas con depuración adicional:

```bash
python -m pytest tests/ -v -s --tb=long
```

Esto proporciona salida más detallada y preserva declaraciones print para depuración.