# ClassQuiz

## Overview

ClassQuiz is a real-time classroom quiz application that enables teachers to run interactive quiz sessions while students participate live. The system uses WebSockets for instant state synchronization between the teacher dashboard and student devices, creating an engaging, game-like learning experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with path aliases (`@/` for client/src, `@shared/` for shared code)

The frontend uses a playful design system with custom fonts (Architects Daughter for display, DM Sans for body, Fira Code for mono) and a vibrant color palette optimized for classroom engagement.

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **Real-time Communication**: Native WebSocket (ws library) on `/ws` path
- **API Pattern**: REST endpoints defined in `shared/routes.ts` with Zod validation schemas

The server handles both HTTP API requests and WebSocket connections for real-time quiz state broadcasting.

### Data Storage
- **In-Memory Storage**: The application uses a local in-memory storage system (`server/storage.ts`) for zero-dependency local execution. No external database is required.
- **Data Persistence**: Data is volatile and resets when the server is restarted.

### Application Flow
1. Teacher logs in with a hardcoded password and accesses the dashboard
2. Students join by entering their name (stored in localStorage for session persistence)
3. Teacher controls quiz state (accepting answers, setting correct answer, resetting)
4. WebSocket broadcasts state changes to all connected clients instantly
5. Students submit answers which are validated against the teacher's set correct answer

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components (shadcn + custom)
│       ├── hooks/        # Custom React hooks (socket, queries)
│       └── pages/        # Route components
├── server/           # Express backend
│   ├── db.ts            # Database connection
│   ├── routes.ts        # API + WebSocket handlers
│   └── storage.ts       # Data access layer
├── shared/           # Shared code between client/server
│   ├── routes.ts        # API route definitions with Zod schemas
│   └── schema.ts        # Drizzle database schema
└── migrations/       # Database migrations
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage (available but quiz uses localStorage for student sessions)

### UI Component Libraries
- **@radix-ui/***: Headless UI primitives for accessible components
- **shadcn/ui**: Pre-styled component library built on Radix primitives
- **lucide-react**: Icon library

### Real-time Communication
- **ws**: WebSocket server implementation
- WebSocket connects to `/ws` path from client

### Build & Development
- **Vite**: Frontend dev server and bundler with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development