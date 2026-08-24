# v1 Acceptance Criteria — RotationTV Unified Platform

## AC-1: TypeScript Build Integrity
- **Criterion:** `npm run build` completes with zero TypeScript errors and zero Vite build errors.
- **Pass Threshold:** Exit code 0, no errors in stderr/stdout.

## AC-2: Route Rendering
- **Criterion:** All declared routes render without runtime errors:
  - `/` — Landing page with hero, trending, upcoming events, stats
  - `/channels` — Channel browser with search
  - `/live` — Live stream selector
  - `/vod` — VOD library grid
  - `/browse` — Category browser with pills, filters, grid/list toggle
  - `/guide` — TV Guide EPG with time grid, channel rows, program modals
  - `/auth` — Login/register form
  - `/watch/:id` — Watch page with player + related content
- **Pass Threshold:** All routes load without blank screens or console crashes.

## AC-3: Category/Genre/Show/Lineup Data Model
- **Criterion:** Type definitions exist for Genre (200+ variants), ContentRating, ChannelType, Program, Show, Lineup, Category, ChannelLineupEntry.
- **Pass Threshold:** Files compile, types are imported and used across components.

## AC-4: TV Guide (EPG) Component
- **Criterion:** TVGuide.tsx renders a time-based grid with:
  - Hour columns (120px per hour)
  - Channel rows with program blocks
  - Genre color-coded bars
  - Live pulse indicators
  - Date navigation (prev/next day + date picker)
  - Program detail modal with Watch Now button
  - Current time indicator (red line)
- **Pass Threshold:** Visual verification of grid layout and interactivity.

## AC-5: Category Browser Component
- **Criterion:** CategoryBrowser.tsx provides:
  - Category pills with color coding
  - Genre filter tags
  - Search functionality
  - Grid/List view toggle
  - Show cards with hover effects, badges (ORIGINAL, LIVE, rating)
  - Responsive grid layout
- **Pass Threshold:** Visual verification of filters and layout.

## AC-6: Responsive CSS System
- **Criterion:** index.css contains the RTV responsive system:
  - Fluid typography (`rtv-text-xs` through `rtv-text-hero` using `clamp()`)
  - Container breakpoints (480/768/1024/1440/1920)
  - Channel grid (1→2→3→4→5→6 columns)
  - Spacing scale, touch buttons (44px min), scroll animations
  - Reduced motion support
- **Pass Threshold:** CSS file contains all defined classes.

## AC-7: GitHub Repository Sync
- **Criterion:** All source files are pushed to `rotationtv1-crypto/rtv-unified-platform` on branch `main`.
- **Pass Threshold:** GitHub API confirms file existence and commit history.

## AC-8: Deployment Live
- **Criterion:** Site is accessible at deployed URL with all routes working.
- **Pass Threshold:** HTTP 200 responses for all routes.

## AC-9: Unified Layout (Telegram + Web)
- **Criterion:** App.tsx detects Telegram Mini App vs standalone web and renders appropriate layout.
- **Pass Threshold:** `?mode=web` and `?mode=telegram` URL params force correct mode.
