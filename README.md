# BROTHER · Proyectos (Demo)

Demo funcional sin backend de la plataforma interna de carga de carpetas, evaluación docente e inscripción a festivales estudiantiles para **Brother Escuela de Creativos** (Buenos Aires).

> **Aviso importante:** Esta aplicación es una **demo interactiva con datos falsos de prueba**. No requiere login y todos los cambios que hagas (proyectos, imágenes, evaluaciones, festivales e inscripciones) se guardan únicamente en el `localStorage` de tu navegador bajo la clave `brother-demo-v1`. Podés volver al estado original en cualquier momento con el botón **"Reiniciar demo"** de la franja superior amarilla.

## Cómo correrlo en local

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abrí en el navegador la URL que muestra Vite (por defecto `http://localhost:5173/brother-proyectos/`).

Para generar el build de producción:

```bash
npm run build
npm run preview
```

## Arquitectura preparada para Supabase

- **Ruteo:** `HashRouter` (`react-router-dom`) para evitar errores `404` al recargar cualquier ruta en GitHub Pages.
- **Capa de datos única:** Ningún componente accede a `localStorage` en forma directa. Todas las lecturas, escrituras y cálculos de promedios pasan por `src/lib/store.ts`, pensado para reemplazarse en la versión productiva por consultas a Supabase sin modificar las pantallas.
- **Nombre del repositorio en GitHub Pages:** `vite.config.ts` usa `base: '/brother-proyectos/'`. Si tu repositorio público en GitHub tiene otro nombre, actualizá ese valor para que coincida con `/<nombre-del-repo>/`.
