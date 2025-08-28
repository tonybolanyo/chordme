# Guía de Internacionalización (i18n)

ChordMe ahora admite múltiples idiomas con inglés como predeterminado y español como primer idioma adicional.

## Resumen

El sistema de internacionalización está construido usando [react-i18next](https://react.i18next.com/), proporcionando:

- **Detección automática de idioma** basada en las preferencias del navegador
- **Cambio manual de idioma** con almacenamiento persistente
- **Mecanismo de respaldo** al inglés para traducciones faltantes
- **Arquitectura escalable** para agregar más idiomas

## Idiomas Compatibles

- **Inglés (en)** - Idioma predeterminado
- **Español (es)** - Primer idioma adicional

## Características

### Selector de Idioma
Un componente selector de idioma está disponible en el encabezado que permite a los usuarios:
- Cambiar entre idiomas compatibles
- Ver el idioma activo actual
- Persistir la selección de idioma en localStorage

### Detección Automática
El sistema detecta automáticamente el idioma preferido del usuario desde:
1. localStorage (selección previa)
2. Configuración del idioma del navegador
3. Respaldo al inglés si no es compatible

### Sistema de Respaldo
Si falta una traducción en el idioma seleccionado, el sistema automáticamente recurre al inglés.

## Uso para Desarrolladores

### Agregar Nuevas Claves de Traducción

1. **Agregar a traducciones en inglés** (`frontend/src/locales/en/common.json`):
```json
{
  "newSection": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

2. **Agregar a traducciones en español** (`frontend/src/locales/es/common.json`):
```json
{
  "newSection": {
    "title": "Nueva funcionalidad",
    "description": "Esta es una nueva funcionalidad"
  }
}
```

### Usar Traducciones en Componentes

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('newSection.title')}</h1>
      <p>{t('newSection.description')}</p>
    </div>
  );
};
```

### Interpolación

Soporte para valores dinámicos:

```tsx
// Archivo de traducción
{
  "welcome": "Bienvenido, {{username}}!"
}

// Uso en componente
<p>{t('welcome', { username: user.name })}</p>
```

## Agregar Nuevos Idiomas

Para agregar un nuevo idioma (ej., francés):

1. **Actualizar idiomas compatibles** en `frontend/src/i18n/config.ts`:
```typescript
export const supportedLanguages = ['en', 'es', 'fr'] as const;
```

2. **Crear archivo de traducción** `frontend/src/locales/fr/common.json`:
```json
{
  "app": {
    "title": "ChordMe",
    "subtitle": "Paroles et accords de manière simple."
  }
  // ... copiar estructura de en/common.json y traducir
}
```

3. **Importar en configuración** `frontend/src/i18n/config.ts`:
```typescript
import frCommon from '../locales/fr/common.json';

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  fr: { common: frCommon },
};
```

4. **Actualizar LanguageSwitcher** para incluir la etiqueta del nuevo idioma en los archivos de traducción.

## Pautas de Traducción

### Inglés (Predeterminado)
- Usar lenguaje claro y conciso
- Seguir convenciones estándar de UI
- Usar capitalización de oración para botones y etiquetas
- Usar capitalización de título para encabezados

### Español
- Usar forma formal "usted" para texto dirigido al usuario
- Seguir convenciones de UI en español
- Mantener terminología consistente
- Considerar variaciones regionales (preferir español neutro)

### Reglas Generales
- Considerar la longitud del texto (algunos idiomas son más largos)
- Preservar marcadores de posición y sintaxis de interpolación
- Mantener tono y estilo consistentes
- Probar el diseño de UI con texto traducido

## Estructura de Archivos

```
frontend/src/
├── i18n/
│   ├── config.ts          # Configuración i18n
│   └── config.test.ts     # Pruebas para configuración i18n
├── locales/
│   ├── en/
│   │   └── common.json    # Traducciones en inglés
│   └── es/
│       └── common.json    # Traducciones en español
└── components/
    └── LanguageSwitcher/  # Componente selector de idioma
```

## Pruebas

Ejecutar pruebas de i18n:
```bash
npm run test:run src/i18n/config.test.ts
npm run test:run src/components/LanguageSwitcher/LanguageSwitcher.test.tsx
```

## Compatibilidad de Navegadores

El sistema i18n funciona con todos los navegadores modernos que admiten:
- API localStorage
- API Intl (para posibles mejoras futuras)
- Módulos ES6

## Rendimiento

- Los archivos de traducción se incluyen con la aplicación
- Sin carga en tiempo de ejecución de archivos de traducción
- Sobrecarga mínima con react-i18next
- El cambio de idioma es instantáneo

## Accesibilidad

El componente LanguageSwitcher incluye:
- Etiquetas y roles ARIA apropiados
- Soporte para navegación por teclado
- Anuncios para lectores de pantalla
- Soporte para modo de alto contraste