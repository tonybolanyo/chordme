---
layout: default
lang: es
title: Implementación de seguridad de contraseñas
---

# Implementación de almacenamiento seguro de contraseñas

## Resumen

ChordMe implementa almacenamiento seguro de contraseñas estándar de la industria usando el algoritmo de hash bcrypt. Esta implementación asegura que las contraseñas de usuarios nunca se almacenen en texto plano y proporciona protección robusta contra ataques comunes de contraseñas.

## Detalles de implementación

### Configuración de bcrypt

La aplicación usa bcrypt para hash de contraseñas con rondas configurables:

- **Producción**: 12 rondas (por defecto)
- **Pruebas**: 4 rondas (para ejecución más rápida de pruebas)
- **Configurable**: Establecido vía `BCRYPT_ROUNDS` en configuración

```python
# config.py
BCRYPT_ROUNDS = 12  # Rondas bcrypt por defecto para hash de contraseñas

# test_config.py
BCRYPT_ROUNDS = 4  # Rondas menores para pruebas más rápidas
```

### Proceso de hash de contraseñas

#### 1. Validación de entrada
- Valida que la contraseña no esté vacía
- Asegura que la contraseña sea de tipo string
- Aplica requisitos integrales de fortaleza de contraseña:
  - Mínimo 8 caracteres, máximo 128
  - Al menos una letra mayúscula
  - Al menos una letra minúscula  
  - Al menos un dígito
  - Sin patrones débiles (ej., caracteres idénticos consecutivos)
  - No en lista de contraseñas débiles comunes

#### 2. Hash bcrypt
```python
def set_password(self, password):
    # Validación de entrada
    if not password:
        raise ValueError("Password cannot be empty")
    
    if not isinstance(password, str):
        raise ValueError("Password must be a string")
    
    # Obtener rondas configuradas
    rounds = current_app.config.get('BCRYPT_ROUNDS', 12)
    
    # Hash de contraseña
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=rounds)
    password_hash = bcrypt.hashpw(password_bytes, salt)
    
    # Almacenar como string
    self.password_hash = password_hash.decode('utf-8')
```

#### 3. Verificación de contraseña
```python
def check_password(self, password):
    # Validación de entrada
    if not password or not isinstance(password, str):
        return False
    
    if not self.password_hash:
        return False
    
    # Verificar usando bcrypt
    password_bytes = password.encode('utf-8')
    hash_bytes = self.password_hash.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)
```

## Características de seguridad

### 1. Generación de sal
- Cada contraseña obtiene una sal única y criptográficamente segura
- Generada usando `bcrypt.gensalt()` con rondas configurables
- La sal está incrustada en el hash, no se necesita almacenamiento separado

### 2. Resistencia a ataques de tiempo
- bcrypt inherentemente proporciona resistencia a ataques de tiempo
- La implementación preserva esta protección
- Tiempos de respuesta similares para contraseñas válidas/inválidas

### 3. Seguridad del formato de hash
- Usa formato bcrypt: `$2b$rounds$salt+hash`
- Versión 2b proporciona mejoras de seguridad más recientes
- Longitud de hash de 60 caracteres (bcrypt estándar)

### 4. Manejo de errores
- Manejo elegante de casos límite
- Validación integral de entrada
- Registro detallado para depuración (sin exponer datos sensibles)

### 5. Flexibilidad de configuración
- Rondas bcrypt configurables para diferentes entornos
- Fallback a valores por defecto seguros si la configuración no está disponible
- Soporte para futuras actualizaciones de algoritmo

## Mejores prácticas de seguridad implementadas

### 1. Sin almacenamiento en texto plano
- Las contraseñas se hash inmediatamente al recibirlas
- Las contraseñas originales nunca se almacenan o registran
- Almacenamiento solo de hash en base de datos

### 2. Sales únicas
- Cada hash de contraseña usa una sal única
- Previene ataques de tabla arcoíris
- Asegura que contraseñas idénticas tengan hashes diferentes

### 3. Factor de trabajo adecuado
- 12 rondas para producción (recomendado para 2024)
- Configurable para adaptarse a mejoras de hardware
- Seguridad balanceada vs. rendimiento

### 4. Sanitización de entrada
- Validación integral de contraseñas
- Protección contra contraseñas débiles comunes
- Soporte Unicode con codificación apropiada

### 5. Valores por defecto seguros
- Valores de fallback seguros si falta configuración
- Configuraciones de seguridad conservadoras
- Manejo explícito de errores

## Cobertura de pruebas

### Suite integral de pruebas
La implementación de hash de contraseñas incluye pruebas extensivas:

#### Pruebas de integración
- Hash de contraseñas a través de API de registro
- Verificación de contraseñas a través de API de inicio de sesión
- Soporte de caracteres especiales (Unicode, emoji, símbolos)
- Validación de sensibilidad a mayúsculas/minúsculas

#### Pruebas de seguridad
- Sin exposición de contraseñas en respuestas API
- Verificación de resistencia a ataques de tiempo
- Validación de formato de hash
- Múltiples usuarios con la misma contraseña producen hashes diferentes

#### Pruebas de casos límite
- Manejo de contraseñas vacías
- Manejo de contraseñas faltantes
- Manejo de None/tipo inválido
- Soporte de contraseñas de longitud máxima

#### Pruebas de configuración
- Configuración de rondas bcrypt
- Configuraciones de diferentes entornos
- Comportamiento de fallback

### Ejemplos de pruebas

```python
def test_password_hashing_through_registration(self, client):
    """Probar hash de contraseñas a través de endpoint de registro de usuario."""
    user_data = {
        'email': 'test@example.com',
        'password': 'TestPassword123!'
    }
    
    response = client.post('/api/v1/auth/register',
                         json=user_data,
                         content_type='application/json')
    
    assert response.status_code == 201
    # La contraseña no debería estar en la respuesta
    assert 'password' not in str(response.get_json())
```

## Consideraciones de rendimiento

### Selección de rondas bcrypt
- **4 rondas**: ~1ms tiempo de hash (solo pruebas)
- **12 rondas**: ~250ms tiempo de hash (producción)
- **15 rondas**: ~2s tiempo de hash (alta seguridad)

### Recomendaciones
- Monitorear tiempos de respuesta de inicio de sesión/registro
- Ajustar rondas basado en capacidades de hardware
- Considerar compensaciones entre experiencia de usuario vs. seguridad

## Migración y actualizaciones

### Actualizaciones de configuración
Para actualizar rondas bcrypt:
1. Actualizar `BCRYPT_ROUNDS` en configuración
2. Las nuevas contraseñas usarán las nuevas rondas automáticamente
3. Las contraseñas existentes permanecen válidas (bcrypt almacena rondas en hash)

### Migración de algoritmo
Futuros cambios de algoritmo (ej., a Argon2):
1. Agregar soporte de nuevo algoritmo junto con bcrypt
2. Migrar contraseñas gradualmente durante inicio de sesión
3. Mantener compatibilidad hacia atrás

## Cumplimiento y estándares

### Cumplimiento de estándares
- **Hoja de trucos de almacenamiento de contraseñas OWASP**: Totalmente conforme
- **NIST SP 800-63B**: Cumple directrices para almacenamiento de contraseñas
- **PCI DSS**: Satisface requisitos para datos de tarjetas de pago

### Elección de algoritmo
- **bcrypt**: Estándar de la industria, bien probado
- **FIPS 140-2**: Usa funciones criptográficas aprobadas
- **Listo para el futuro**: La configuración soporta actualizaciones de algoritmo

## Monitoreo y mantenimiento

### Monitoreo de seguridad
- Registrar fallas de hash de contraseñas (sin exponer datos)
- Monitorear patrones de autenticación inusuales
- Rastrear métricas de rendimiento de bcrypt

### Tareas de mantenimiento
- Revisar regularmente configuración de rondas bcrypt
- Monitorear nuevas recomendaciones de seguridad
- Actualizar dependencias (librería bcrypt)

### Auditorías de seguridad
- Revisar políticas de contraseñas periódicamente
- Probar resistencia a ataques de tiempo
- Validar consistencia de formato de hash

## Dependencias

### Requisitos principales
```
bcrypt==4.1.2
flask==3.1.1
```

### Consideraciones de seguridad
- Mantener la librería bcrypt actualizada
- Monitorear avisos de seguridad
- Auditorías regulares de dependencias

## Conclusión

La implementación de almacenamiento de contraseñas de ChordMe proporciona seguridad robusta y estándar de la industria a través de:

- **Hash fuerte**: bcrypt con rondas configurables
- **Sales únicas**: Previene ataques de tabla arcoíris  
- **Validación de entrada**: Requisitos integrales de contraseñas
- **Manejo de errores**: Gestión elegante de casos límite
- **Pruebas**: Cobertura extensiva de pruebas
- **Monitoreo**: Registro apropiado y seguimiento de seguridad

Esta implementación cumple las mejores prácticas actuales de seguridad y proporciona una base para futuras mejoras de seguridad.