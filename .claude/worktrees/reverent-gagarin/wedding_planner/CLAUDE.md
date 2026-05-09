# CLAUDE.md — Amorée

App name: **Amorée**

You are building a premium wedding planning web app for couples in Poland.

## Product goal
Build a beautiful, elegant, soft, feminine, editorial-style wedding planning application focused on:
- budget planning
- venue cost modeling
- guest list management
- vendor management
- payment timeline
- planning checklist
- scenario comparison
- seating planning in later phases

## Core principles
- Accuracy of calculations is more important than speed.
- Never double-count costs already included in a venue package.
- Separate estimated, quoted, contracted, paid, and actual costs.
- Support multiple saved scenarios and side-by-side cost comparison.
- Design must feel bridal, luxurious, soft, warm, and calm.
- Avoid generic SaaS dashboard visuals and AI-looking gradients.
- Prefer restraint, whitespace, elegant typography, and gentle surfaces.

## Product audience
Primary users are engaged couples in Poland planning their own wedding.

## Tech stack
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Deploy on Vercel

## UX rules
- Mobile-first but desktop-excellent.
- Financial numbers must be highly readable.
- Key actions must be obvious.
- Forms should feel calm and lightweight.
- Scenario comparison must be easy to scan.
- Guest list must support households, adults, children, and plus-ones.

## Data and calculation rules
- Use a central calculation engine.
- Do not duplicate formulas across components.
- Store venue presets separately from user overrides.
- Every cost item must have pricing_type, source_type, and status.
- Venue preset logic for Pałac Goetz must reflect the provided offer.

## Design direction
Use an editorial luxury wedding aesthetic:
- light ivory, warm cream, champagne, blush, taupe, dusty rose
- serif display headings + refined sans body text
- soft cards, subtle borders, minimal shadow
- no purple/blue startup gradients
- no dense enterprise dashboards
- no overly decorative wedding clichés

## Build workflow
1. Read docs and data files first.
2. Propose a plan before writing code.
3. Implement the data model and calculation engine first.
4. Build core screens with realistic seeded data.
5. Verify calculations against known Pałac Goetz variants.
6. Refine UI only after calculation accuracy is stable.

## Quality bar
- no broken types
- no dead states without empty-state design
- no fake placeholder data where real seed data exists
- no inconsistent totals across views
- every major module has loading, empty, and error states
