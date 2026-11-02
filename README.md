# MetaphorGoals

MetaphorGoals es una aplicación web desarrollada con SvelteKit que transforma tareas, proyectos y objetivos personales en experiencias narrativas gamificadas. En lugar de gestionar una simple lista de pendientes, el usuario vive cada tarea como una misión, un capítulo o un nivel dentro de una historia más grande.

La idea central del producto es convertir la productividad en una experiencia más motivadora, visual y narrativa: cada avance se siente como un progreso dentro de una aventura, con contexto, temática, progresión y atmósfera cinematográfica.

Demo en vivo: https://theapp-cyan.vercel.app

## Descripción general

MetaphorGoals combina:

- productividad personal
- gamificación
- narrativa generada por IA
- progresión por niveles o capítulos
- autenticación segura
- persistencia con base de datos relacional

El flujo principal del producto es:

1. El usuario crea una cuenta.
2. Define una tarea, proyecto o meta personal.
3. Elige un tema o estilo narrativo.
4. La aplicación genera una historia alrededor de esa tarea usando IA.
5. La tarea se divide en capítulos o niveles.
6. El usuario avanza progresivamente según el cumplimiento de la meta.
7. La experiencia queda guardada en base de datos para su revisión posterior.

## Visión del producto

La aplicación aborda un problema clásico de productividad: la disciplina y la motivación se vuelven más difíciles cuando la tarea parece abstracta o repetitiva.

MetaphorGoals propone una alternativa:

- la tarea deja de ser una nota aislada
- se convierte en una misión
- la historia da sentido al esfuerzo
- cada progreso parece ser un avance dentro de una aventura significativa

Esto es especialmente útil para:

- objetivos de aprendizaje
- proyectos personales
- hábitos y rutinas
- desarrollo de habilidades técnicas
- trabajo creativo
- productividad con enfoque emocional y motivacional

## Funcionalidades principales

### 1. Generación narrativa por IA

Cada proyecto puede transformarse en una historia temática. La aplicación usa Gemini para generar capítulos narrativos según el tema elegido y el objetivo del usuario.

Temas soportados incluyen:

- Cruzada medieval
- Fantasía y magia
- Guerra espacial
- Apocalipsis zombi
- Cyberpunk
- Steampunk
- Superhéroes
- Agente secreto
- Detective noir
- Aprendizaje infantil y adolescente
- Desarrollo de habilidades

### 2. Sistema de progreso por niveles

Las tareas se almacenan con:

- título
- temática
- cantidad de niveles
- estado actual
- posibilidad de avance, reinicio, archivado y eliminación

La lógica de negocio separa la tarea del contenido narrativo y permite representar la progresión como capítulos o misiones.

### 3. Autenticación de usuarios

La app incluye un flujo real de registro e inicio de sesión. La sesión del usuario se maneja con cookies firmadas y validación en servidor.

La autenticación cubre:

- registro
- login
- protección de rutas privadas
- validación de sesión
- cierre de sesión

### 4. Persistencia con base de datos

El proyecto usa PostgreSQL con Drizzle ORM para almacenar:

- usuarios
- tareas
- niveles
- progresos asociados a cada tarea

Esto permite que la experiencia narrativa sobreviva a recargas y sesiones nuevas.

### 5. Experiencia visual cinematográfica

La UI tiene un estilo visual dinámico, con animaciones, fondos ambientados, tarjetas de contenido y experiencias visuales influenciadas por la narrativa del proyecto.

La metadata cinematográfica generada por la IA incluye información visual como:

- effect
- color
- speed
- lighting
- mood

Esto aporta una capa estética que refuerza la sensación de aventura.

### 6. Scaffolding y automatización

El repositorio incluye scripts para agilizar el desarrollo, como:

- creación de rutas
- creación de componentes
- generación de formularios reactivos
- scaffolding de módulos completos
- generación de autenticación

Esto convierte al proyecto en una base de trabajo muy productiva para prototipos y desarrollo iterativo.

## Stack tecnológico

### Frontend

- Svelte
- SvelteKit
- TypeScript
- Vite
- Svelte Motion

### Backend y persistencia

- Drizzle ORM
- PostgreSQL
- Supabase

### Autenticación y seguridad

- bcryptjs
- cookies firmadas con HMAC SHA-256
- validación de sesión en servidor

### Integración con IA

- Google GenAI SDK
- Gemini

### Herramientas de desarrollo

- Prettier
- Svelte-check
- Drizzle Kit

## Arquitectura de la aplicación

La aplicación sigue una estructura típica de SvelteKit con separación entre:

- frontend
- rutas públicas
- rutas autenticadas
- lógica del servidor
- persistencia
- generación de contenido con IA

```text
.
├── src/
│   ├── lib/
│   │   ├── components/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   └── auth.ts
│   │   ├── audio.ts
│   │   ├── chapterUtils.ts
│   │   ├── supabaseClient.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.server.ts
│   │   ├── +page.svelte
│   │   ├── auth/
│   │   └── dashboard/
│   ├── app.html
│   ├── app.d.ts
│   ├── hooks.server.ts
│   └── service-worker.js
├── drizzle/
├── NF-Sca/
├── drizzle.config.ts
├── package.json
├── README.md
├── tsconfig.json
├── vite.config.ts
└── ...
