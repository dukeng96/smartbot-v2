# Smartbot Web — Admin SaaS Frontend

## Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript (strict)
- **UI**: shadcn/ui v4 (base-nova) + Tailwind CSS v4
- **State**: Zustand (auth, UI) + TanStack Query v5 (server state)
- **Forms**: React Hook Form + Zod
- **HTTP**: ky
- **Icons**: Lucide React
- **Charts**: Recharts
- **Toasts**: sonner
- **Dates**: date-fns
- **Uploads**: react-dropzone

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Auth pages (login, register, etc.)
│   ├── (dashboard)/       # Authenticated pages with AppShell
│   │   ├── bots/          # Bot management (C1-C7)
│   │   ├── knowledge-bases/ # Knowledge base management (D1-D4)
│   │   ├── conversations/ # Conversation history (E1-E2)
│   │   ├── analytics/     # Analytics & reports (F1-F2)
│   │   ├── billing/       # Plans, subscription, payments (G1-G4)
│   │   └── settings/      # Profile, workspace, team (H1-H3)
│   ├── layout.tsx         # Root layout (providers, fonts)
│   ├── error.tsx          # Global error boundary
│   └── not-found.tsx      # 404 page
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── layout/            # AppShell, Sidebar, Header, PageHeader
│   └── shared/            # DataTable, StatusBadge, EmptyState, etc.
└── lib/
    ├── api/               # ky HTTP client
    ├── constants/          # Navigation, app constants
    ├── providers/          # QueryProvider
    ├── stores/             # Zustand stores (auth, UI)
    ├── types/              # API response types
    └── utils/              # Formatters (date, currency, number)
```

## Design Tokens

CSS custom properties in `globals.css`. Primary = `#6D28D9` (purple). Vietnamese UI copy by default.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
