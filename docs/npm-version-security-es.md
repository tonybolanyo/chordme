---
layout: default
lang: es
title: Documentación de seguridad del comando npm version
---

# Documentación de seguridad del comando npm version

## Issue #92: Citas apropiadas de la variable VERSION

### Problema
El comando `npm version` puede ser vulnerable a inyección de shell y comportamiento inesperado si la variable VERSION no está correctamente entrecomillada.

### Solución
Todos los comandos `npm version` deben entrecomillar la variable VERSION:
```bash
# [PASSED] CORRECTO - Correctamente entrecomillado
npm version "$VERSION" --no-git-tag-version

# [FAILED] INCORRECTO - Sin comillas (potencialmente peligroso)
npm version $VERSION --no-git-tag-version
```

### Implicaciones de seguridad

#### Sin comillas (Peligroso)
```bash
VERSION='1.0.0$(echo "-injected")'
npm version $VERSION --no-git-tag-version
# ¡Podría resultar en inyección de comandos!
```

#### Con comillas (Seguro)
```bash
VERSION='1.0.0$(echo "-injected")'
npm version "$VERSION" --no-git-tag-version
# npm rechaza de forma segura la cadena de versión inválida
```

### Estado actual de implementación

[PASSED] **Todos los comandos npm version están correctamente entrecomillados en ChordMe:**

1. **scripts/sync-version.sh** (líneas 21, 26):
   ```bash
   npm version "$VERSION" --no-git-tag-version
   ```

2. **.github/workflows/release.yml** (líneas 62, 66):
   ```bash
   npm version "$VERSION" --no-git-tag-version
   ```

### Mejores prácticas

1. **Siempre entrecomillar las variables de shell** cuando contengan entrada de usuario o datos que puedan contener caracteres especiales
2. **Usar `--no-git-tag-version`** para prevenir el etiquetado automático de git durante las actualizaciones de versión
3. **Validar cadenas de versión** antes de usarlas en scripts
4. **Probar con casos extremos** para asegurar seguridad y confiabilidad

### Pruebas

La seguridad de nuestra implementación ha sido validada con pruebas integrales incluyendo:
- Versiones semánticas normales (1.2.3, 2.0.0-alpha, etc.)
- Cadenas potencialmente peligrosas con metacaracteres de shell
- Intentos de inyección de comandos
- Intentos de expansión de variables

Todas las pruebas confirman que nuestra implementación entrecomillada es segura y maneja casos extremos apropiadamente.

---

**Cambia idioma:** [English](npm-version-security.md) | **Español**