# CAD Gallery Web Application — Development Plan

## Overview

Build a full-stack React + Vite web application deployed on **Vercel** (frontend + serverless API routes) that provides three main screens:

1. **Screen 1 — CAD Gallery**: Grid of CAD model cards with variant sub-galleries
2. **Screen 2 — CAD Generator**: LLM-assisted JSCAD code generation with live 3D preview
3. **Screen 3 — CAD Workbench**: Parameter-driven model editor with 3D preview

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| 3D viewer | React Three Fiber + @react-three/drei |
| CAD geometry | @jscad/modeling (runs in browser) |
| LLM integration | Google Gemini `gemini-2.5-flash` via Vercel serverless API route |
| Rate limiting | Upstash Redis (20 req / IP / day, 7-day prompt cache) |
| Data persistence | `data/cards.json` committed to repo — read/written by serverless functions via `fs` |
| Deployment | Vercel (CI/CD via GitHub integration) |
| Export | @jscad/stl-serializer + @jscad/obj-serializer |

### Architecture Overview

```
Browser
  ├─ Screen 1  ──→  GET /api/cards  ──→  data/cards.json (fs.readFileSync)
  ├─ Screen 2  ──→  POST /api/generate-jscad  ──→  Gemini API
  │                 (JSCAD JS returned, eval'd in browser)
  │             ──→  POST /api/cards  ──→  data/cards.json (fs.writeFileSync)
  └─ Screen 3  ──→  eval JSCAD JS in browser (no API call)
                ──→  POST /api/cards  ──→  data/cards.json (fs.writeFileSync)
```

### Key Design Decisions

- **No Python**: The LLM generates valid OpenJSCAD JavaScript (`@jscad/modeling` API). The browser evaluates the returned code directly via a sandboxed `Function()` constructor.
- **Backend proxy only**: The Gemini API key is set **exclusively as a Vercel environment variable** via the Vercel dashboard. It must never appear in any file in the repository — not in `.env`, not in `.env.example`, not anywhere. The frontend never calls Google directly.
- **Manual update in Screen 3**: Parameter controls do not trigger re-evaluation on every change; the user clicks "Update Model" explicitly.
- **Persistent storage**: Card metadata (title, author, description, flags, JSCAD source, thumbnail data-URL) is stored in `data/cards.json` committed to the repo. Vercel serverless functions read/write this file via the Node.js `fs` module. Thumbnails are stored inline as base64 data-URLs — no separate asset files needed.
- **No conversation reset**: Multi-turn chat history is session-only; no "Reset conversation" button is in scope.

---

## Stage 1 — Project Scaffold & Tooling

**Assigned Agent**: `[AGENT_INFRA]`

**Objective**: Create a working, deployable Vite + React + Tailwind skeleton with Vercel configuration, CI/CD wired, and all npm dependencies installed.

**Required Skills/Modes**: `Mode: Agent` — file generation, shell commands, config files

### Tasks

- Scaffold project with `npm create vite@latest . -- --template react` (JavaScript, not TypeScript)
- Install production dependencies:
  - `react`, `react-dom` (already included)
  - `@react-three/fiber`, `@react-three/drei`, `three`
  - `@jscad/modeling`, `@jscad/stl-serializer`, `@jscad/obj-serializer`
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `react-router-dom` (for screen routing)
  - `@upstash/redis`
- Install dev dependencies: `vite`, `@vitejs/plugin-react`, `eslint`
- Initialize Tailwind: `npx tailwindcss init -p` — configure `content` paths
- Create `vercel.json` with rewrite rule: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
- Create `.env.example` listing only `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — **`GEMINI_API_KEY` must NOT appear in any repo file; it is set only via the Vercel dashboard**
- Create `data/cards.json` with an empty array `[]` as initial state — commit this file to the repo
- Set up `src/` folder structure:
  ```
  src/
    components/
    screens/
      Gallery/
      Generator/
      Workbench/
    api/         ← Vercel API routes live at /api/ at project root
    hooks/
    utils/
    store/
  api/            ← Vercel serverless functions (project root)
  ```
- Wire `react-router-dom` routes: `/` → Gallery, `/generate` → Generator, `/workbench/:cardId` → Workbench
- Verify `npm run dev` serves the app and `npm run build` produces a `dist/` folder with no errors

**Deliverable**: Clean repo committed to GitHub, Vercel project linked, preview deployment URL live, `npm run build` exits 0.

**Status**: [ ] pending

---

## Stage 2 — Data Layer & JSON File Schema

**Assigned Agent**: `[AGENT_BACKEND]`

**Objective**: Define the card data schema, implement `data/cards.json` read/write helpers used by the serverless API routes, and seed one fixture card.

**Required Skills/Modes**: `Mode: Agent` — Vercel serverless functions, Node.js `fs` module

### Card Schema (stored as objects in `data/cards.json` array)

```jsonc
{
  "id": "uuid-v4",
  "title": "string",
  "author": "string",
  "description": "string",
  "thumbnail": "data:image/png;base64,…",  // captured from Three.js canvas
  "jscadSource": "string",                 // full JSCAD JS code
  "parentId": "string | null",             // null = root card, uuid = variant of parent
  "manufacturingProcesses": ["FDM", "CNC"],
  "flags": {
    "has2DDrawing": false,
    "hasFEM": false,
    "hasManufacturingInstructions": false
  },
  "createdAt": "ISO8601"
}
```

`data/cards.json` is a flat array of all card objects (both root cards and variants). Variants are distinguished by `parentId !== null`.

### Tasks

- Create `api/_lib/cardStore.js` (shared helper, not a route) with functions:
  - `readCards()` → parses and returns the full array from `data/cards.json`
  - `writeCards(cards)` → serializes and writes back to `data/cards.json`
  - `getAllRootCards()` → filters where `parentId === null`, attaches `variantCount`
  - `getCard(id)` → finds by id
  - `getVariants(parentId)` → filters where `parentId === given id`
  - `saveCard(card)` → appends or replaces by id
  - `deleteCard(id)` → removes by id
- Create Vercel API routes (files under `api/`):
  - `api/cards/index.js` → `GET` returns all root cards with `variantCount`; `POST` saves a new card
  - `api/cards/[id].js` → `GET` single card; `PATCH` update; `DELETE` remove
  - `api/cards/[id]/variants.js` → `GET` all variants of a card
- Seed `data/cards.json` with one fixture card (a simple cube JSCAD source, placeholder thumbnail)
- Verify locally with `vercel dev`: `GET /api/cards` returns the fixture card

**Deliverable**: `GET /api/cards` returns the seeded fixture; `POST /api/cards` adds a card and it appears on the next `GET`; `data/cards.json` is updated on disk.

**Status**: [ ] pending

---

## Stage 3 — Shared 3D Viewer Component

**Assigned Agent**: `[AGENT_3D_KERNEL]`

**Objective**: Build a reusable `<JscadViewer>` component that accepts a JSCAD geometry object (or raw JS source string), renders it via React Three Fiber, supports orbit/pan/zoom, and can capture a thumbnail PNG.

**Required Skills/Modes**: `Mode: Agent` — React Three Fiber, @jscad/modeling, Three.js BufferGeometry conversion

### Tasks

- Create `src/components/JscadViewer/JscadViewer.jsx`
  - Props: `jscadSource: string`, `onThumbnail?: (dataURL: string) => void`
  - Evaluate `jscadSource` inside a `try/catch` using `new Function('jscad', sourceBody)(jscadModeling)` — this is the safe sandboxed eval pattern
  - Convert JSCAD geometry polygons → Three.js `BufferGeometry` (iterate `geom.polygons`, triangulate, build `Float32Array` for `position` attribute)
  - Render with `<Canvas>` from R3F, add `<OrbitControls>` from drei, add ambient + directional lights
  - On successful geometry load, capture thumbnail via `gl.domElement.toDataURL('image/png')` and call `onThumbnail`
  - Display a centered error message if eval or geometry conversion throws
- Create `src/utils/jscadEval.js` with the `evalJscadSource(source)` function (returns JSCAD geometry or throws)
- Create `src/utils/jscadToThree.js` with `jscadGeomToBufferGeometry(geom)` converter
- Create a dev-only test page `src/screens/ViewerTest.jsx` rendering the cube fixture to smoke-test

**Deliverable**: Navigating to `/viewer-test` shows a 3D rotating cube with working orbit controls and no console errors.

**Status**: [x] complete

---

## Stage 4 — Screen 1: CAD Gallery

**Assigned Agent**: `[AGENT_UI_UX]`

**Objective**: Build the gallery screen with card grid, icon status indicators, variant sub-gallery context menu, and the "+" new card button.

**Required Skills/Modes**: `Mode: Agent` — React, Tailwind CSS, component composition

### Card Component Specification (`<CadCard>`)

| Element | Detail |
|---|---|
| Thumbnail | `<img>` top of card, 16:9 or square aspect, object-cover |
| Title | Bold, one line, truncate overflow |
| Author | Subdued text |
| Description | 2-line clamp |
| Manufacturing processes | Horizontal pill badges |
| Status icons (4 total) | 2D Drawing, FEM Simulation, Manufacturing Instructions, Variants — **full color** when `true`, **gray** when `false` |
| "Open in CAD Workbench" | Blue button, bottom-right of card |
| Variants icon | Clickable only when `has variants === true` |

### Tasks

- Create `src/screens/Gallery/GalleryScreen.jsx`
  - Fetch all root cards from `GET /api/cards` on mount (use `useEffect` + `fetch`)
  - Render a CSS grid of `<CadCard>` components
  - Floating `+` button (bottom-right of screen) that navigates to `/generate`
- Create `src/components/CadCard/CadCard.jsx`
  - Accept full card object as props
  - Render icons using SVG inline or a small icon library (e.g. `lucide-react`)
  - Gray out icons with Tailwind class `text-gray-300` vs `text-blue-500` (or appropriate color)
  - "Open in CAD Workbench" button → `navigate('/workbench/:id')`
  - Variant icon click → toggle variant sub-gallery
- Create `src/components/VariantGallery/VariantGallery.jsx`
  - Displayed as a floating context menu anchored to the card
  - Horizontal scrollable row of `<CadCard>` mini-cards (same component, scaled down)
  - Fetch variants from `GET /api/cards/:id/variants` when opened
  - Close when clicking outside (use `useRef` + `mousedown` listener)
- Apply consistent Tailwind spacing, hover states, and focus outlines throughout

**Deliverable**: Gallery screen shows seeded fixture card with correct icon states; variant sub-gallery opens and closes; "+" navigates to `/generate`; "Open in CAD Workbench" navigates to `/workbench/:id`.

**Status**: [ ] pending

---

## Stage 5 — Gemini API Backend Proxy

**Assigned Agent**: `[AGENT_BACKEND]`

**Objective**: Implement the secure `POST /api/generate-jscad` serverless endpoint with Gemini integration, Upstash Redis rate limiting, and 7-day prompt caching.

**Required Skills/Modes**: `Mode: Agent` — Vercel serverless functions, Upstash Redis SDK, Gemini REST API

### Endpoint Contract

```
POST /api/generate-jscad
Body:  { "prompt": string, "conversationHistory": [{role, parts}][] }
200:   { "jscadSource": string, "cached": boolean }
429:   { "error": "Rate limit exceeded" }
500:   { "error": "…" }
```

### Gemini Prompt Engineering

The system prompt must instruct Gemini to:
1. Return **only** valid OpenJSCAD JavaScript — no markdown fences, no explanation text
2. The code must export a `main()` function returning JSCAD geometry
3. Parameters intended as user-adjustable controls must be declared at the top with the `input_` prefix (e.g. `const input_width = 10; // slider min=1 max=100 step=1`)
4. Use only `@jscad/modeling` primitives and transforms

### Tasks

- Create `api/generate-jscad.js` (Vercel serverless function)
- Read `GEMINI_API_KEY` from `process.env` — never hardcode
- Implement rate limiting using Upstash Redis:
  - Key: `ratelimit:<ip>:<YYYY-MM-DD>` — increment on each request, `EXPIREAT` end of day
  - If count > 20, return 429
- Implement prompt cache using Upstash Redis:
  - Cache key: `promptcache:<sha256(prompt)>`
  - TTL: 7 days (604800 seconds)
  - On cache hit, return cached JSCAD source with `"cached": true`
- Call Gemini `gemini-2.5-flash` via REST (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`)
  - Pass full `conversationHistory` array for multi-turn context
  - Set `maxOutputTokens: 2048`
- Strip any accidental markdown code fences from the response before returning
- Add CORS headers for `localhost` and the Vercel deployment URL

**Deliverable**: `curl -X POST /api/generate-jscad -d '{"prompt":"a simple cube"}'` returns valid JSCAD JavaScript. Second identical call returns `"cached": true`. 21st call from same IP returns 429.

**Status**: [ ] pending

---

## Stage 6 — Screen 2: CAD Generator

**Assigned Agent**: `[AGENT_UI_UX]`

**Objective**: Build the split-pane CAD generator screen with LLM chat interface (left 25%) and live 3D viewer (right 75%), Save and Export buttons.

**Required Skills/Modes**: `Mode: Agent` — React, Tailwind CSS, fetch API, JscadViewer component

### Layout

```
┌──────────────────────────────────────────────────────┐
│  [Save CAD File]  [Export CAD File]                  │  ← top bar
├────────────────┬─────────────────────────────────────┤
│  Chat (25%)    │  3D Viewer (75%)                    │
│                │                                     │
│  [history]     │  <JscadViewer jscadSource={…} />   │
│                │                                     │
│  [input + Send]│                                     │
└────────────────┴─────────────────────────────────────┘
```

### Tasks

- Create `src/screens/Generator/GeneratorScreen.jsx`
  - State: `conversationHistory[]`, `jscadSource`, `isLoading`, `error`
  - On "Send": append user message, POST to `/api/generate-jscad`, append assistant response, update `jscadSource`
  - Render conversation history (user messages right-aligned, assistant left-aligned)
  - Show a spinner in place of the send button during loading
  - Show inline error if API returns non-200
- Create `src/components/ChatPane/ChatPane.jsx` (controlled, receives state + callbacks as props)
- Wire in `<JscadViewer jscadSource={jscadSource} onThumbnail={setThumbnail} />`
- "Save CAD File" button:
  - Open a modal (`<SaveCardModal>`) to collect: title, author, description, manufacturing processes (checkboxes), flags (checkboxes)
  - On confirm: POST to `POST /api/cards` with all fields + `jscadSource` + captured `thumbnail`
  - Navigate back to `/` on success and show the new card in the gallery
- "Export CAD File" button:
  - Open a modal (`<ExportModal>`) with: format selector (STL / OBJ), filename text input, directory note (browser download limitation)
  - On confirm: run `@jscad/stl-serializer` or `@jscad/obj-serializer` on current geometry, trigger browser download via `<a href=blob download=filename>`

**Deliverable**: Typing a prompt generates JSCAD JS, the 3D viewer updates, Save writes a new card to KV that appears in the gallery, Export downloads a valid STL/OBJ file.

**Status**: [ ] pending

---

## Stage 7 — Screen 3: CAD Workbench

**Assigned Agent**: `[AGENT_UI_UX]`

**Objective**: Build the parameter-driven workbench screen. Left pane shows controls parsed from `input_` prefixed variables in the JSCAD source; right pane shows the 3D viewer. "Update Model" re-evaluates with new parameter values.

**Required Skills/Modes**: `Mode: Agent` — React, Tailwind CSS, JSCAD parameter parsing, JscadViewer component

### Layout (mirrors Screen 2)

```
┌──────────────────────────────────────────────────────┐
│  [Save Variant]  [Export CAD File]  [Update Model]   │  ← top bar
├────────────────┬─────────────────────────────────────┤
│  Controls(25%) │  3D Viewer (75%)                    │
│  ─────────────  │                                     │
│  input_width   │  <JscadViewer jscadSource={…} />   │
│  [slider]      │                                     │
│  input_height  │                                     │
│  [number input]│                                     │
└────────────────┴─────────────────────────────────────┘
```

### Parameter Parsing

Parse `input_` variables from the JSCAD source using a regex scan of the top-level lines. For each match, detect the type by reading the inline comment:

| Comment annotation | Control rendered |
|---|---|
| `// slider min=X max=Y step=Z` | `<input type="range">` + numeric display |
| `// options A\|B\|C` | `<select>` or radio group |
| `// int` or integer value | Number input with step=1 |
| `// float` or float value | Number input with step=0.1 (or from comment) |
| (none — default) | Text input |

Create `src/utils/parseJscadParams.js` that returns `Array<{ name, type, defaultValue, min?, max?, step?, options? }>`.

### Tasks

- Create `src/screens/Workbench/WorkbenchScreen.jsx`
  - Load card by `id` from `GET /api/cards/:id` on mount
  - Parse parameters with `parseJscadParams(jscadSource)`
  - Maintain `paramValues` state (object keyed by param name)
  - "Update Model": rebuild JSCAD source by substituting `const input_X = <value>` lines with current `paramValues`, then set `jscadSource` state → `<JscadViewer>` re-renders
- Create `src/components/ParamControls/ParamControls.jsx`
  - Render one control per parameter
  - Slider: `<input type="range">` + numeric read-out
  - Radio: `<fieldset>` with one `<input type="radio">` per option
  - Int/float: `<input type="number">` with appropriate `step`
- "Save Variant" button:
  - Open `<SaveCardModal>` (same modal from Stage 6, reused)
  - Populate with parent card's title (append " — variant") as default
  - POST to `/api/cards` with `parentId` set to parent's ID
  - On success, navigate back to `/` so user can see the new variant in the sub-gallery
- "Export CAD File": reuse `<ExportModal>` from Stage 6 (same component)
- Ensure all top-bar button styles are visually consistent with Screen 2 buttons

**Deliverable**: Opening a card in the workbench shows parsed parameter controls; changing values and clicking "Update Model" updates the 3D geometry; "Save Variant" creates a child card that appears in the gallery variant sub-gallery; Export downloads correct geometry.

**Status**: [ ] pending

---

## Stage 8 — Thumbnail Generation & Polish

**Assigned Agent**: `[AGENT_UI_UX]`

**Objective**: Ensure thumbnails are captured and stored correctly, apply visual polish (loading skeletons, empty state, error boundaries), and finalize responsive layout.

**Required Skills/Modes**: `Mode: Agent` — React, Tailwind CSS, Three.js `gl.domElement.toDataURL`

### Tasks

- Confirm `<JscadViewer onThumbnail>` callback fires after the first render frame and the data-URL is valid PNG
- Add a skeleton loader (`<CadCardSkeleton>`) rendered while gallery cards are fetching
- Add an empty-state illustration/message in the gallery when there are zero cards
- Add a React `<ErrorBoundary>` around `<JscadViewer>` to catch eval/geometry errors gracefully
- Make the gallery grid responsive: 1 col on mobile, 2 on tablet, 3+ on desktop (Tailwind `grid-cols-*`)
- Ensure `<VariantGallery>` scrolls horizontally and shows a scroll indicator when overflowing
- Add page `<title>` tags per screen via `document.title` in `useEffect`
- Final pass: ensure all buttons have hover, focus, and disabled states styled

**Deliverable**: Gallery shows skeleton loaders during fetch, empty state when empty, error boundary catches bad JSCAD, responsive grid confirmed in browser DevTools device mode.

**Status**: [ ] pending

---

## Stage 9 — CI/CD, Environment Variables & Deployment

**Assigned Agent**: `[AGENT_INFRA]`

**Objective**: Finalize Vercel deployment configuration, document all required environment variables, and verify the production build is fully functional.

**Required Skills/Modes**: `Mode: Agent` — Vercel config, GitHub Actions (optional lint/test gate)

### Tasks

- Document all required environment variables in `README.md`:
  - **Vercel dashboard only** (never in any repo file): `GEMINI_API_KEY` — Google AI Studio key
  - **Vercel dashboard + `.env.example`**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Explain clearly: any developer cloning the repo must set `GEMINI_API_KEY` directly in their Vercel project settings
- Add a `.github/workflows/ci.yml` that runs `npm run build` on every PR to `main` (no deploy, just build gate)
- Confirm `vercel.json` has correct SPA rewrite and no conflicting API route rewrites
- Verify that `api/` functions are auto-detected by Vercel's file-system routing
- Add `VITE_` prefix to any env vars needed at build time (none expected — all secrets are server-side)
- Test on Vercel preview: gallery loads, generation calls the proxy, rate limit returns 429 after threshold

**Deliverable**: `main` branch auto-deploys to Vercel production URL; CI workflow passes on PRs; `README.md` documents full setup steps including env var configuration.

**Status**: [ ] pending

---

## Custom Modes Required

The following custom Bob modes should be created before beginning implementation:

| Mode ID | Purpose |
|---|---|
| `agent-infra` | Scaffolding, config files, CI/CD, Vercel config — no domain logic |
| `agent-backend` | Serverless API routes, KV schema, Redis — no frontend code |
| `agent-3d-kernel` | R3F, Three.js, JSCAD geometry conversion — isolated 3D concerns |
| `agent-ui-ux` | React screens, Tailwind components, modals, layout — no backend/3D internals |

Each mode should be configured with `Mode: Agent` capabilities and a `roleDefinition` scoped to its domain.

---

## Dependency Graph

```
Stage 1 (Scaffold)
    └─→ Stage 2 (Data Layer)
    └─→ Stage 3 (3D Viewer)
            Stage 2 + Stage 3
                └─→ Stage 4 (Gallery Screen)
                └─→ Stage 5 (Gemini Proxy)
                        Stage 3 + Stage 5
                            └─→ Stage 6 (Generator Screen)
                        Stage 3 + Stage 2
                            └─→ Stage 7 (Workbench Screen)
                                    Stage 6 + Stage 7
                                        └─→ Stage 8 (Polish)
                                                └─→ Stage 9 (CI/CD + Deploy)
```

---

## Product Requirements Document (PRD)

### PRD-1: Functional Requirements

| ID | Requirement |
|---|---|
| F-01 | Gallery displays all root CAD cards in a responsive grid |
| F-02 | Each card shows thumbnail, title, author, description, manufacturing process badges, and 4 status icons |
| F-03 | Status icons appear in full color when the associated flag is true; gray when false |
| F-04 | Cards with variants show a clickable group icon that opens a horizontal sub-gallery context menu |
| F-05 | The sub-gallery scrolls horizontally when variant count exceeds visible area |
| F-06 | A "+" FAB button on the gallery navigates to Screen 2 |
| F-07 | Each card has an "Open in CAD Workbench" button that navigates to Screen 3 for that card |
| F-08 | Screen 2 has a left chat pane (~25%) and right 3D viewer (~75%) |
| F-09 | Chat messages are sent to `POST /api/generate-jscad` which calls Gemini; response updates the 3D viewer |
| F-10 | The LLM conversation is multi-turn (full history passed each call) |
| F-11 | Screen 2 has "Save CAD File" (saves new root card) and "Export CAD File" (download STL/OBJ) buttons |
| F-12 | Screen 3 parses `input_` prefixed variables from JSCAD source and renders appropriate controls |
| F-13 | Screen 3 "Update Model" button re-evaluates JSCAD with substituted parameter values |
| F-14 | Screen 3 has "Save Variant" (saves as child card) and "Export CAD File" buttons consistent in style with Screen 2 |
| F-15 | Export allows format selection (STL or OBJ), filename input, and triggers browser download |

### PRD-2: Non-Functional Requirements

| ID | Requirement |
|---|---|
| NF-01 | `GEMINI_API_KEY` must never appear in frontend code, browser network requests, or the repository |
| NF-02 | Rate limit: 20 Gemini requests per IP per calendar day |
| NF-03 | Identical prompts are cached for 7 days (Upstash Redis); cached responses must not count toward the rate limit |
| NF-04 | 3D viewer supports orbit, pan, and zoom; no object selection required |
| NF-05 | JSCAD evaluation must not crash the page; errors must be caught and displayed inline |
| NF-06 | The application must be deployable to Vercel with zero manual server configuration |
| NF-07 | The gallery grid must be responsive (1/2/3+ columns based on viewport width) |

### PRD-3: Out of Scope

- User authentication / multi-user accounts
- Real file-system directory selection (browser download API limitation)
- Python-based CAD generation
- FEM simulation engine
- 2D drawing generation
- Live (keystroke-level) parameter updates in Screen 3
- Object selection or measurement in the 3D viewer
