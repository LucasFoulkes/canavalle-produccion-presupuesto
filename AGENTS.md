# Repository Guidelines

## Project Structure & Module Organization
- `src/routes` hosts TanStack Router file modules for the Supabase table browser and production analytics; each page pairs its own hooks and presenters.
- `src/components` contains reusable UI (tables, sidebar, forms) styled with Tailwind 4 and shadcn primitives; `src/components/filter-toolbar.tsx` now centralises filtering UI.
- `src/services` wraps Supabase and Dexie helpers plus table metadata; regenerate helpers with `scripts/generate-services.ts` whenever `schema.json` changes.
- `src/lib` centralises utilities, Supabase/Dexie clients, and filter helpers; `src/hooks` covers live queries, offline sync, and UI composition.
- Static assets live under `public/`; Vite builds output to `dist/`.

## Build, Test, and Development Commands
- `cp .env.example .env` then populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before running the app.
- `npm install` installs dependencies and refreshes generated types.
- `npm run dev` starts Vite with HMR at http://localhost:5173.
- `npm run build` compiles TypeScript project references and emits the production bundle.
- `npm run preview` serves the built bundle for smoke testing.
- `npm run lint` runs ESLint; legacy `any` usage still surfaces warnings in the service layer.

## Coding Style & Naming Conventions
- Stick to TypeScript + ES modules; name React components/files in PascalCase and utilities in camelCase.
- Prefer Tailwind utility classes; keep bespoke styles in `src/index.css` only when utilities fall short.
- Use 2-space indentation and rely on the repo ESLint/Prettier defaults; run `npm run lint` before opening a PR.
- Generate new table services instead of hand-writing CRUD logic to stay aligned with Dexie/Supabase typing.

## Testing Guidelines
- Automated tests are not yet in place; use `npm run lint` and manual verification through `/db/<table>` and `/estimados/*` routes.
- When adding tests, reach for Vitest with React Testing Library and colocate specs as `*.test.tsx`.
- Validate Dexie sync by toggling offline mode in DevTools and ensuring Supabase refreshes once back online.

## Commit & Pull Request Guidelines
- Write focused commits with imperative subjects (e.g., `Extract filter toolbar`) and include context in the body when helpful.
- Reference related issues or Supabase tickets in PR descriptions and enumerate affected routes or tables.
- Include manual verification notes (filters run, sync succeeded) plus screenshots or clips for UI tweaks.
- Call out schema or environment changes—especially updates to `.env`—so reviewers can reproduce locally.
