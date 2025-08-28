---
layout: default
lang: es
title: Reporte de auditoría de seguridad del backend
---

# Reporte de auditoría de seguridad del backend
Generado: 2025-08-26T21:19:41.171471

## Resumen ejecutivo

**Puntuación de seguridad: 85/100**
**Estado: BUENO**
**Problemas críticos: 0**

## Análisis estático de código (Bandit)

- Problemas totales: 3
- Severidad alta: 0
- Severidad media: 0
- Severidad baja: 3

## Vulnerabilidades de dependencias (Safety)

- Vulnerabilidades encontradas: 0
- Estado: VULNERABILITIES_FOUND

## Pruebas OWASP Top 10

- Pruebas totales: 24
- Aprobadas: 4
- Fallidas: 3
- Omitidas: 0

## Configuración de seguridad

- Aplicación Https: ✅
- Cabeceras seguras: ❌
- Limitación de velocidad: ❌
- Protección Csrf: ✅
- Hash de contraseñas: ✅
- Cabeceras de seguridad: ✅
- Limitador de velocidad: ✅

## Recomendaciones

1. Corregir pruebas de seguridad OWASP fallidas
2. Implementar limitación de velocidad para endpoints de autenticación

## Reportes detallados

- Reporte Bandit: security_reports/bandit_report.json
- Reporte Safety: security_reports/safety_report.json
- Resultados de pruebas OWASP: security_reports/owasp_test_results.json