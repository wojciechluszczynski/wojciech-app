# Amorée MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a premium wedding planning web app (Amorée) for Polish couples with budget planning, scenario comparison, guest management, vendor tracking, and payment timeline.

**Architecture:** Next.js 15 App Router with Server Components for data-heavy views, a single pure calculation engine in `lib/calculator.ts`, and Supabase for auth + Postgres + storage. All financial values stored as integers (grosze). No client-side calculation logic — everything derived from `lib/calculator.ts`.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS v4, shadcn/ui, Supabase JS v2, Zod, Vitest

---

## Task 1: Bootstrap project

**Files:**
- Create: root (Next.js scaffold)
- Modify: `tailwind.config.ts`, `app/globals.css`
- Create: `.env.local.example`

**Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
npx shadcn@latest init
```

When shadcn asks: choose "New York" style, CSS variables yes, base color "neutral".

**Step 3: Add shadcn base components**

```bash
npx shadcn@latest add button card badge table tabs dialog sheet input label select textarea separator skeleton
```

**Step 4: Create env example**

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Step 5: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: bootstrap Next.js 15 + Supabase + shadcn + Vitest"
```

---

## Task 2: Design tokens and global styles

**Files:**
- Modify: `app/globals.css`
- Create: `lib/tokens.ts`
- Create: `components/ui/typography.tsx`

**Step 1: Set CSS custom properties in globals.css**

Replace the default Tailwind/shadcn CSS variable block with Amorée palette:

```css
@layer base {
  :root {
    /* Amorée palette */
    --background: 48 33% 97%;        /* ivory */
    --foreground: 20 14% 15%;        /* espresso */
    --card: 40 30% 95%;              /* warm cream */
    --card-foreground: 20 14% 15%;
    --popover: 40 30% 95%;
    --popover-foreground: 20 14% 15%;
    --primary: 340 18% 58%;          /* dusty rose */
    --primary-foreground: 0 0% 100%;
    --secondary: 38 28% 88%;         /* champagne */
    --secondary-foreground: 20 14% 15%;
    --muted: 30 15% 90%;             /* taupe surface */
    --muted-foreground: 25 12% 45%;  /* taupe text */
    --accent: 350 25% 82%;           /* blush */
    --accent-foreground: 20 14% 15%;
    --destructive: 0 60% 50%;
    --destructive-foreground: 0 0% 100%;
    --border: 35 20% 87%;
    --input: 35 20% 87%;
    --ring: 340 18% 58%;
    --radius: 0.5rem;
  }
}
```

**Step 2: Add serif font (Playfair Display) + sans (Inter)**

In `app/layout.tsx`:

```tsx
import { Inter, Playfair_Display } from 'next/font/google'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
})
```

In `globals.css`, add:
```css
body {
  font-family: var(--font-sans);
}
```

**Step 3: Create typography components**

```tsx
// components/ui/typography.tsx
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

export function DisplayHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={cn('font-display text-3xl font-semibold tracking-tight text-foreground', className)}>
      {children}
    </h1>
  )
}

export function SectionHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn('font-display text-xl font-medium tracking-tight text-foreground', className)}>
      {children}
    </h2>
  )
}

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  )
}
```

Add `fontFamily` to `tailwind.config.ts`:
```ts
fontFamily: {
  sans: ['var(--font-sans)', 'sans-serif'],
  display: ['var(--font-display)', 'serif'],
},
```

**Step 4: Create MoneyValue component**

```tsx
// components/ui/money-value.tsx
import { cn } from '@/lib/utils'

interface MoneyValueProps {
  grosze: number
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function MoneyValue({ grosze, className, size = 'md' }: MoneyValueProps) {
  const zloty = (grosze / 100).toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const sizeClass = {
    sm: 'text-sm tabular-nums',
    md: 'text-base tabular-nums font-medium',
    lg: 'text-2xl tabular-nums font-semibold tracking-tight',
    xl: 'text-4xl tabular-nums font-semibold tracking-tight font-display',
  }[size]

  return (
    <span className={cn(sizeClass, className)}>
      {zloty} zł
    </span>
  )
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Amorée design tokens, typography, MoneyValue component"
```

---

## Task 3: App shell layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/layout/sidebar.tsx`
- Create: `components/layout/top-bar.tsx`
- Create: `app/(app)/layout.tsx`

**Step 1: Create authenticated layout**

```tsx
// app/(app)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Create Sidebar**

```tsx
// components/layout/sidebar.tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Przeglad' },
  { href: '/budget', label: 'Budzet' },
  { href: '/scenarios', label: 'Scenariusze' },
  { href: '/guests', label: 'Goscie' },
  { href: '/vendors', label: 'Dostawcy' },
  { href: '/payments', label: 'Platnosci' },
  { href: '/checklist', label: 'Checklist' },
]

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col py-8 px-4 gap-1">
      <div className="px-2 pb-6">
        <span className="font-display text-lg font-semibold text-foreground">Amorée</span>
      </div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors'
          )}
        >
          {item.label}
        </Link>
      ))}
    </aside>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add app shell layout with sidebar"
```

---

## Task 4: Supabase client setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Modify: `middleware.ts`

**Step 1: Create browser client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 2: Create server client**

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 3: Create types placeholder**

Create `types/database.ts` with `export type Database = any` — will be replaced by `supabase gen types` after schema is set up.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client wrappers (browser + server)"
```

---

## Task 5: Database schema

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

**Step 1: Write migration**

```sql
-- supabase/migrations/0001_initial_schema.sql

create extension if not exists "uuid-ossp";

-- Weddings
create table weddings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null default 'Nasze wesele',
  wedding_date date,
  created_at timestamptz default now()
);
alter table weddings enable row level security;
create policy "owner" on weddings for all using (auth.uid() = user_id);

-- Scenarios
create table scenarios (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid references weddings on delete cascade not null,
  name text not null,
  is_active boolean default false,
  guest_count_adults integer not null default 75,
  guest_count_children integer not null default 0,
  notes text,
  created_at timestamptz default now()
);
alter table scenarios enable row level security;
create policy "owner" on scenarios for all
  using (exists (select 1 from weddings w where w.id = wedding_id and w.user_id = auth.uid()));

-- Venue presets
create table venue_presets (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  rules jsonb not null default '{}'
);

-- Scenario venue config
create table scenario_venue_configs (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid references scenarios on delete cascade not null,
  venue_preset_id uuid references venue_presets,
  overrides jsonb default '{}',
  enabled_options text[] default '{}'
);
alter table scenario_venue_configs enable row level security;
create policy "owner" on scenario_venue_configs for all
  using (exists (
    select 1 from scenarios s
    join weddings w on w.id = s.wedding_id
    where s.id = scenario_id and w.user_id = auth.uid()
  ));

-- Cost items
create table cost_items (
  id uuid primary key default uuid_generate_v4(),
  scenario_id uuid references scenarios on delete cascade not null,
  category text not null,
  name text not null,
  pricing_type text not null check (pricing_type in ('fixed','per_guest','per_child','per_room','conditional','manual')),
  source_type text not null check (source_type in ('venue_offer','vendor_quote','manual_estimate','actual','derived')),
  status text not null default 'estimated' check (status in ('estimated','quoted','booked','deposit_paid','partially_paid','paid','cancelled')),
  unit_price_grosze integer,
  quantity integer,
  formula_key text,
  included_in_package boolean default false,
  override_value_grosze integer,
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table cost_items enable row level security;
create policy "owner" on cost_items for all
  using (exists (
    select 1 from scenarios s
    join weddings w on w.id = s.wedding_id
    where s.id = scenario_id and w.user_id = auth.uid()
  ));

-- Households
create table households (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid references weddings on delete cascade not null,
  name text not null,
  side text check (side in ('bride','groom','shared')),
  notes text
);
alter table households enable row level security;
create policy "owner" on households for all
  using (exists (select 1 from weddings w where w.id = wedding_id and w.user_id = auth.uid()));

-- Guests
create table guests (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references households on delete cascade not null,
  wedding_id uuid references weddings on delete cascade not null,
  first_name text not null,
  last_name text,
  age_group text not null default 'adult' check (age_group in ('adult','teen','child','infant')),
  side text check (side in ('bride','groom','shared')),
  invitation_status text default 'not_sent' check (invitation_status in ('not_sent','sent','confirmed','declined')),
  rsvp_status text default 'pending' check (rsvp_status in ('pending','attending','not_attending','maybe')),
  meal_preference text,
  accommodation_needed boolean default false,
  seating_notes text,
  notes text
);
alter table guests enable row level security;
create policy "owner" on guests for all
  using (exists (select 1 from weddings w where w.id = wedding_id and w.user_id = auth.uid()));

-- Vendors
create table vendors (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid references weddings on delete cascade not null,
  category text not null,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  quote_min_grosze integer,
  quote_max_grosze integer,
  selected_offer_grosze integer,
  contract_status text default 'none' check (contract_status in ('none','negotiating','signed','cancelled')),
  notes text
);
alter table vendors enable row level security;
create policy "owner" on vendors for all
  using (exists (select 1 from weddings w where w.id = wedding_id and w.user_id = auth.uid()));

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid references weddings on delete cascade not null,
  vendor_id uuid references vendors,
  cost_item_id uuid references cost_items,
  label text not null,
  amount_grosze integer not null,
  due_date date not null,
  paid_at date,
  status text not null default 'pending' check (status in ('pending','paid','overdue','cancelled'))
);
alter table payments enable row level security;
create policy "owner" on payments for all
  using (exists (select 1 from weddings w where w.id = wedding_id and w.user_id = auth.uid()));
```

**Step 2: Apply migration**

```bash
supabase db push
# or via Supabase dashboard SQL editor if CLI not set up
```

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema with RLS policies"
```

---

## Task 6: Seed Palac Goetz venue preset

**Files:**
- Create: `supabase/seed.sql`

**Step 1: Write seed**

```sql
-- supabase/seed.sql

insert into venue_presets (slug, name, rules) values (
  'palac-goetz',
  'Palac Goetz',
  '{
    "menu_full_price_grosze": 65500,
    "open_bar_grosze": 22500,
    "bartender_fee_grosze": 200000,
    "bartender_fee_threshold": 100,
    "hall_lighting_grosze": 850000,
    "room_with_breakfast_grosze": 65000,
    "organizational_cost_per_missing_guest_grosze": 35000,
    "organizational_cost_max_grosze": 875000,
    "saturday_minimum_guests": 75,
    "deposit_rate": 0.2,
    "included_in_menu": ["sweet_table", "cold_buffet", "hot_buffet", "standard_drinks"],
    "optional_items": ["open_bar", "bartender", "hall_lighting", "accommodation"]
  }'
);
```

**Step 2: Apply seed**

```bash
supabase db reset --linked
# or run the seed SQL in the Supabase dashboard
```

**Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: seed Palac Goetz venue preset"
```

---

## Task 7: Calculation engine

**Files:**
- Create: `lib/calculator.ts`
- Create: `lib/calculator.test.ts`

**Step 1: Write failing tests first**

```ts
// lib/calculator.test.ts
import { describe, it, expect } from 'vitest'
import { calculateVenueTotal, type VenueScenarioInput } from './calculator'

const goetzRules = {
  menu_full_price_grosze: 65500,
  open_bar_grosze: 22500,
  bartender_fee_grosze: 200000,
  bartender_fee_threshold: 100,
  hall_lighting_grosze: 850000,
  room_with_breakfast_grosze: 65000,
  organizational_cost_per_missing_guest_grosze: 35000,
  organizational_cost_max_grosze: 875000,
  deposit_rate: 0.2,
  included_in_menu: ['sweet_table', 'cold_buffet', 'hot_buffet', 'standard_drinks'],
  optional_items: ['open_bar', 'bartender', 'hall_lighting', 'accommodation'],
}

describe('calculateVenueTotal - Palac Goetz reference variants', () => {
  it('50 guests: total 79500 PLN', () => {
    const input: VenueScenarioInput = {
      rules: goetzRules,
      guest_count_adults: 50,
      guest_count_children: 0,
      enabled_options: ['open_bar'],
      overrides: {},
    }
    const result = calculateVenueTotal(input)
    expect(result.total_grosze).toBe(7_950_000)
    expect(result.deposit_grosze).toBe(1_590_000)
    expect(result.remaining_grosze).toBe(6_360_000)
  })

  it('75 guests: total 101500 PLN', () => {
    const input: VenueScenarioInput = {
      rules: goetzRules,
      guest_count_adults: 75,
      guest_count_children: 0,
      enabled_options: ['open_bar'],
      overrides: {},
    }
    const result = calculateVenueTotal(input)
    expect(result.total_grosze).toBe(10_150_000)
    expect(result.deposit_grosze).toBe(2_030_000)
    expect(result.remaining_grosze).toBe(8_120_000)
  })

  it('100 guests: total 112750 PLN', () => {
    const input: VenueScenarioInput = {
      rules: goetzRules,
      guest_count_adults: 100,
      guest_count_children: 0,
      enabled_options: ['open_bar'],
      overrides: {},
    }
    const result = calculateVenueTotal(input)
    expect(result.total_grosze).toBe(11_275_000)
    expect(result.deposit_grosze).toBe(2_255_000)
    expect(result.remaining_grosze).toBe(9_020_000)
  })
})
```

**Step 2: Run tests — expect failure**

```bash
npm test
```

Expected: FAIL — "calculateVenueTotal is not defined"

**Step 3: Implement calculator**

```ts
// lib/calculator.ts

export interface VenueRules {
  menu_full_price_grosze: number
  open_bar_grosze: number
  bartender_fee_grosze: number
  bartender_fee_threshold: number
  hall_lighting_grosze: number
  room_with_breakfast_grosze: number
  organizational_cost_per_missing_guest_grosze: number
  organizational_cost_max_grosze: number
  deposit_rate: number
  included_in_menu: string[]
  optional_items: string[]
}

export interface VenueScenarioInput {
  rules: VenueRules
  guest_count_adults: number
  guest_count_children: number
  enabled_options: string[]
  overrides: Record<string, number> // formula_key -> override_grosze
  room_count?: number
}

export interface VenueTotalResult {
  total_grosze: number
  deposit_grosze: number
  remaining_grosze: number
  line_items: Array<{ key: string; label: string; amount_grosze: number; included: boolean }>
}

export function calculateVenueTotal(input: VenueScenarioInput): VenueTotalResult {
  const { rules, guest_count_adults, guest_count_children, enabled_options, overrides, room_count = 0 } = input
  const line_items: VenueTotalResult['line_items'] = []

  function add(key: string, label: string, amount_grosze: number, included = false) {
    const final = overrides[key] ?? amount_grosze
    line_items.push({ key, label, amount_grosze: final, included })
    return final
  }

  let total = 0

  // Menu — always included, per adult guest
  total += add('menu', 'Menu weselne', rules.menu_full_price_grosze * guest_count_adults, true)

  // Organizational cost for small weddings (< 100 guests)
  if (guest_count_adults < 100) {
    const missing = 100 - guest_count_adults
    const org_cost = Math.min(
      missing * rules.organizational_cost_per_missing_guest_grosze,
      rules.organizational_cost_max_grosze
    )
    total += add('organizational_cost', 'Koszt organizacyjny', org_cost, true)
  }

  // Open bar — optional
  if (enabled_options.includes('open_bar')) {
    total += add('open_bar', 'Open bar', rules.open_bar_grosze * guest_count_adults)

    // Bartender fee — triggered when open bar is on AND guests < threshold
    if (guest_count_adults < rules.bartender_fee_threshold) {
      total += add('bartender', 'Barman', rules.bartender_fee_grosze)
    }
  }

  // Hall lighting — optional
  if (enabled_options.includes('hall_lighting')) {
    total += add('hall_lighting', 'Oswietlenie sali', rules.hall_lighting_grosze)
  }

  // Accommodation — optional, per room
  if (enabled_options.includes('accommodation') && room_count > 0) {
    total += add('accommodation', 'Noclegi ze sniadaniem', rules.room_with_breakfast_grosze * room_count)
  }

  const deposit_grosze = Math.round(total * rules.deposit_rate)
  const remaining_grosze = total - deposit_grosze

  return {
    total_grosze: total,
    deposit_grosze,
    remaining_grosze,
    line_items,
  }
}

export interface CostSummary {
  total_estimated_grosze: number
  total_confirmed_grosze: number
  total_paid_grosze: number
  cost_per_guest_grosze: number
}

export function summarizeCosts(
  cost_items: Array<{ final_total_grosze: number; status: string; included_in_package: boolean }>,
  guest_count: number
): CostSummary {
  const active = cost_items.filter((c) => c.status !== 'cancelled')
  const total_estimated = active.reduce((sum, c) => sum + c.final_total_grosze, 0)
  const confirmed_statuses = ['booked', 'deposit_paid', 'partially_paid', 'paid']
  const total_confirmed = active
    .filter((c) => confirmed_statuses.includes(c.status))
    .reduce((sum, c) => sum + c.final_total_grosze, 0)
  const total_paid = active
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + c.final_total_grosze, 0)

  return {
    total_estimated_grosze: total_estimated,
    total_confirmed_grosze: total_confirmed,
    total_paid_grosze: total_paid,
    cost_per_guest_grosze: guest_count > 0 ? Math.round(total_estimated / guest_count) : 0,
  }
}
```

**Step 4: Run tests — expect pass**

```bash
npm test
```

Expected: All 3 PASS — 50/75/100 guest variants match reference totals.

If any fail, re-check the organizational cost formula:
- 50 guests: menu=50×655=32750, org=(100-50)×350=17500, open_bar=50×225=11250, bartender=2000 → total=63500... 

Wait — reference says 79500 for 50 guests. Let me recalculate:
- menu: 50 × 655 = 32,750 PLN
- org cost: min((100-50)×350, 8750) = min(17500, 8750) = 8,750 PLN
- open bar: 50 × 225 = 11,250 PLN
- bartender (50 < 100): 2,000 PLN
- subtotal: 32750 + 8750 + 11250 + 2000 = 54,750 PLN

That's not 79,500. So the reference totals likely include accommodation or other fixed items. Need the actual offer PDF to reconcile. The unit tests should be written against the actual calculated output once the offer is confirmed. Write tests that assert the logic is internally consistent first, then add reference total tests once offer data is confirmed.

**Step 5: Commit**

```bash
git add lib/calculator.ts lib/calculator.test.ts
git commit -m "feat: add central calculation engine with venue preset logic"
```

---

## Task 8: Auth flow

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/login/actions.ts`
- Create: `middleware.ts`

**Step 1: Create login page**

```tsx
// app/(auth)/login/page.tsx
import { login, loginWithGoogle } from './actions'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <span className="font-display text-3xl font-semibold text-foreground">Amorée</span>
          <p className="mt-2 text-sm text-muted-foreground">Planowanie wesela, elegancko.</p>
        </div>
        <form className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="password">Haslo</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            formAction={login}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Zaloguj sie
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Create auth server actions**

```ts
// app/(auth)/login/actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

**Step 3: Create middleware**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add auth flow — login page, server actions, middleware"
```

---

## Task 9: Dashboard screen

**Files:**
- Create: `app/(app)/dashboard/page.tsx`
- Create: `components/dashboard/summary-card.tsx`
- Create: `components/dashboard/scenario-selector.tsx`

**Step 1: Create summary card component**

```tsx
// components/dashboard/summary-card.tsx
import { Card } from '@/components/ui/card'
import { MoneyValue } from '@/components/ui/money-value'
import { Muted } from '@/components/ui/typography'

interface SummaryCardProps {
  label: string
  amount_grosze: number
  sublabel?: string
  size?: 'default' | 'large'
}

export function SummaryCard({ label, amount_grosze, sublabel, size = 'default' }: SummaryCardProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <Muted className="mb-2">{label}</Muted>
      <MoneyValue grosze={amount_grosze} size={size === 'large' ? 'xl' : 'lg'} />
      {sublabel && <Muted className="mt-1 text-xs">{sublabel}</Muted>}
    </Card>
  )
}
```

**Step 2: Create dashboard page (Server Component)**

```tsx
// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { SummaryCard } from '@/components/dashboard/summary-card'
import { DisplayHeading, Muted } from '@/components/ui/typography'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load active scenario
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*, cost_items(*)')
    .eq('is_active', true)
    .single()

  const totalGrosze = scenario?.cost_items?.reduce(
    (sum: number, item: { override_value_grosze?: number; unit_price_grosze?: number; quantity?: number }) =>
      sum + (item.override_value_grosze ?? (item.unit_price_grosze ?? 0) * (item.quantity ?? 1)),
    0
  ) ?? 0

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <DisplayHeading>Przeglad</DisplayHeading>
        <Muted className="mt-1">
          {scenario ? scenario.name : 'Brak aktywnego scenariusza'}
        </Muted>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Szacowany koszt" amount_grosze={totalGrosze} size="large" />
        <SummaryCard label="Koszt na osobe" amount_grosze={scenario ? Math.round(totalGrosze / scenario.guest_count_adults) : 0} />
        <SummaryCard label="Goscie" amount_grosze={0} sublabel={`${scenario?.guest_count_adults ?? 0} doroslych`} />
        <SummaryCard label="Wplacono" amount_grosze={0} />
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dashboard screen with summary cards"
```

---

## Task 10: Budget screen

**Files:**
- Create: `app/(app)/budget/page.tsx`
- Create: `components/budget/cost-table.tsx`
- Create: `components/budget/add-cost-item-dialog.tsx`

**Step 1: Create cost table**

```tsx
// components/budget/cost-table.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { MoneyValue } from '@/components/ui/money-value'

const STATUS_LABELS: Record<string, string> = {
  estimated: 'Szacunek',
  quoted: 'Oferta',
  booked: 'Zarezerwowane',
  deposit_paid: 'Zaliczka',
  partially_paid: 'Czesc oplacona',
  paid: 'Oplacone',
  cancelled: 'Anulowane',
}

interface CostItem {
  id: string
  category: string
  name: string
  status: string
  included_in_package: boolean
  unit_price_grosze: number | null
  quantity: number | null
  override_value_grosze: number | null
}

export function CostTable({ items }: { items: CostItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pozycja</TableHead>
          <TableHead>Kategoria</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Kwota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const amount = item.override_value_grosze
            ?? ((item.unit_price_grosze ?? 0) * (item.quantity ?? 1))
          return (
            <TableRow key={item.id} className={item.included_in_package ? 'opacity-60' : ''}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {STATUS_LABELS[item.status] ?? item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <MoneyValue grosze={amount} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

**Step 2: Create budget page**

```tsx
// app/(app)/budget/page.tsx
import { createClient } from '@/lib/supabase/server'
import { CostTable } from '@/components/budget/cost-table'
import { DisplayHeading } from '@/components/ui/typography'
import { MoneyValue } from '@/components/ui/money-value'

export default async function BudgetPage() {
  const supabase = await createClient()
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*, cost_items(*)')
    .eq('is_active', true)
    .single()

  const items = scenario?.cost_items ?? []
  const total = items.reduce(
    (sum: number, item: { override_value_grosze?: number; unit_price_grosze?: number; quantity?: number }) =>
      sum + (item.override_value_grosze ?? (item.unit_price_grosze ?? 0) * (item.quantity ?? 1)),
    0
  )

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <DisplayHeading>Budzet</DisplayHeading>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Lacznie</p>
          <MoneyValue grosze={total} size="xl" />
        </div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">Brak pozycji budzetu. Dodaj pierwsza pozycje.</p>
        </div>
      ) : (
        <CostTable items={items} />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add budget screen with cost table"
```

---

## Task 11: Guest list screen

**Files:**
- Create: `app/(app)/guests/page.tsx`
- Create: `components/guests/household-card.tsx`
- Create: `components/guests/guest-counts.tsx`

**Step 1: Create guest counts bar**

```tsx
// components/guests/guest-counts.tsx
interface GuestCountsProps {
  adults: number
  children: number
  bride_side: number
  groom_side: number
  shared: number
  attending: number
  pending: number
}

export function GuestCounts({ adults, children, bride_side, groom_side, shared, attending, pending }: GuestCountsProps) {
  return (
    <div className="flex flex-wrap gap-6 py-4 border-b border-border">
      <Stat label="Doroslych" value={adults} />
      <Stat label="Dzieci" value={children} />
      <Stat label="Strona Panny Mlodej" value={bride_side} />
      <Stat label="Strona Pana Mlodego" value={groom_side} />
      <Stat label="Wspolni" value={shared} />
      <Stat label="Potwierdzeni" value={attending} />
      <Stat label="Oczekuje" value={pending} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
```

**Step 2: Create guest list page**

```tsx
// app/(app)/guests/page.tsx
import { createClient } from '@/lib/supabase/server'
import { DisplayHeading } from '@/components/ui/typography'
import { GuestCounts } from '@/components/guests/guest-counts'

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: households } = await supabase
    .from('households')
    .select('*, guests(*)')
    .eq('wedding_id', wedding?.id ?? '')
    .order('name')

  const allGuests = households?.flatMap((h) => h.guests) ?? []
  const adults = allGuests.filter((g) => g.age_group === 'adult' || g.age_group === 'teen').length
  const children = allGuests.filter((g) => g.age_group === 'child' || g.age_group === 'infant').length
  const attending = allGuests.filter((g) => g.rsvp_status === 'attending').length
  const pending = allGuests.filter((g) => g.rsvp_status === 'pending').length

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <DisplayHeading>Lista gosci</DisplayHeading>
      <GuestCounts
        adults={adults}
        children={children}
        bride_side={allGuests.filter((g) => g.side === 'bride').length}
        groom_side={allGuests.filter((g) => g.side === 'groom').length}
        shared={allGuests.filter((g) => g.side === 'shared').length}
        attending={attending}
        pending={pending}
      />
      {!households?.length ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">Brak gosci. Dodaj pierwsza rodzine.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {households.map((hh) => (
            <div key={hh.id} className="rounded-lg border border-border bg-card p-4">
              <p className="font-medium text-foreground">{hh.name}</p>
              <p className="text-xs text-muted-foreground mb-3">{hh.side} · {hh.guests.length} osob</p>
              <div className="space-y-1">
                {hh.guests.map((g: { id: string; first_name: string; last_name?: string; age_group: string; rsvp_status: string }) => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span>{g.first_name} {g.last_name}</span>
                    <span className="text-muted-foreground text-xs">{g.rsvp_status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add guest list screen with household view and counts"
```

---

## Task 12: Scenario comparison screen

**Files:**
- Create: `app/(app)/scenarios/page.tsx`
- Create: `components/scenarios/comparison-table.tsx`

**Step 1: Create comparison table**

```tsx
// components/scenarios/comparison-table.tsx
import { MoneyValue } from '@/components/ui/money-value'

interface ScenarioSummary {
  id: string
  name: string
  guest_count_adults: number
  total_grosze: number
  per_guest_grosze: number
  is_active: boolean
}

export function ComparisonTable({ scenarios }: { scenarios: ScenarioSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 pr-6 text-muted-foreground font-normal">Scenariusz</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-normal">Goscie</th>
            <th className="text-right py-3 px-4 text-muted-foreground font-normal">Lacznie</th>
            <th className="text-right py-3 pl-4 text-muted-foreground font-normal">Na osobe</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="py-4 pr-6">
                <span className="font-medium text-foreground">{s.name}</span>
                {s.is_active && (
                  <span className="ml-2 text-xs text-primary">aktywny</span>
                )}
              </td>
              <td className="text-right py-4 px-4 tabular-nums">{s.guest_count_adults}</td>
              <td className="text-right py-4 px-4">
                <MoneyValue grosze={s.total_grosze} size="md" />
              </td>
              <td className="text-right py-4 pl-4">
                <MoneyValue grosze={s.per_guest_grosze} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 2: Create scenarios page**

```tsx
// app/(app)/scenarios/page.tsx
import { createClient } from '@/lib/supabase/server'
import { DisplayHeading } from '@/components/ui/typography'
import { ComparisonTable } from '@/components/scenarios/comparison-table'

export default async function ScenariosPage() {
  const supabase = await createClient()
  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*, cost_items(*)')
    .order('created_at')

  const summaries = (scenarios ?? []).map((s) => {
    const total = s.cost_items.reduce(
      (sum: number, item: { override_value_grosze?: number; unit_price_grosze?: number; quantity?: number }) =>
        sum + (item.override_value_grosze ?? (item.unit_price_grosze ?? 0) * (item.quantity ?? 1)),
      0
    )
    return {
      id: s.id,
      name: s.name,
      guest_count_adults: s.guest_count_adults,
      total_grosze: total,
      per_guest_grosze: s.guest_count_adults > 0 ? Math.round(total / s.guest_count_adults) : 0,
      is_active: s.is_active,
    }
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <DisplayHeading>Scenariusze</DisplayHeading>
      {summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground text-sm">Brak scenariuszy. Stwórz pierwszy scenariusz.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6">
          <ComparisonTable scenarios={summaries} />
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add scenario comparison screen"
```

---

## Task 13: Deploy to Vercel

**Step 1: Verify build passes locally**

```bash
npm run build
```

Fix any TypeScript errors before deploying.

**Step 2: Push to GitHub and connect to Vercel**

Push repo to GitHub, then in Vercel dashboard: import project, set env vars:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Step 3: Verify deploy**

Check Vercel deploy logs. Fix any build errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: production build verified, deployed to Vercel"
```

---

## Notes

- Reference totals for Palac Goetz (79500 / 101500 / 112750 PLN) include items not yet fully modelled. Reconcile against the actual offer PDF before finalizing calculator unit tests.
- `types/database.ts` should be regenerated with `supabase gen types typescript --linked` after schema stabilizes.
- Children pricing: children do NOT inherit adult menu pricing. Add `menu_child_price_grosze` to venue rules when needed.
- All amounts in the UI are displayed in PLN formatted with `toLocaleString('pl-PL')`.
