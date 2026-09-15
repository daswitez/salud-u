# Salud Universitaria — Frontend

Frontend inicial de la plataforma de gestión de atención médica universitaria.

## Stack

- Next.js con App Router
- TypeScript estricto
- Tailwind CSS 4
- ESLint

## Desarrollo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Organización inicial

- `src/app`: rutas, layout global y estilos.
- `src/components`: componentes reutilizables.
- `src/features`: módulos de dominio; por ejemplo, citas, agenda, cola y campañas.

La interfaz debe usar los tokens semánticos definidos en `src/app/globals.css`. Los documentos Markdown en la raíz contienen el contexto funcional, la arquitectura y los flujos del sistema.
