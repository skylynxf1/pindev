# Pindev

Pindev is a modern developer discovery and inspiration platform built for the AI-native generation of builders.

The platform combines social discovery, project sharing, profiles, engagement systems, moderation tooling, and personalized feeds into a clean Pinterest-inspired experience focused specifically on developers, designers, hackers, and indie builders.

Pindev was designed around the idea that modern developers learn publicly, build rapidly with AI tooling, and grow through community-driven discovery.

---

# Features

## Authentication System

- Secure authentication with Supabase Auth
- Session persistence
- Protected routes
- Server-side auth handling
- Auth layouts and gated experiences

## Developer Profiles

- Public user profiles
- Username system
- Follow system
- Profile tabs
- Editable profile information
- Creator-focused identity pages

## Pins / Project Sharing

- Create and edit developer “pins”
- Showcase projects, ideas, concepts, or builds
- Rich metadata support
- Tagging and categorization
- Pin detail views
- Draft support for unfinished posts

## Feed System

- Personalized feed architecture
- Category filtering
- Dynamic content rendering
- Infinite-scroll style feed structure
- Admin-sortable content grid

## Boards

- Save pins into boards
- Board creation flow
- Board picker modal
- Pinterest-inspired organization system

## Engagement Features

- Likes
- Comments
- Follows
- Social interactions between builders

## Search System

- Search result rendering
- Search expansion utilities
- Developer/project discovery tooling

## Moderation & Validation

- Comment moderation utilities
- Zod validation schemas
- Type-safe input validation
- Admin utilities

---

# Tech Stack

## Frontend

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4

## Backend

- Supabase
  - PostgreSQL Database
  - Authentication
  - Row Level Security
  - Storage
  - Server-side auth helpers

## Database

- PostgreSQL (Supabase)

## State & Data

- React hooks architecture
- Server/client Supabase utilities
- Typed query helpers

## Validation

- Zod

## Drag & Drop

- dnd-kit
  - `@dnd-kit/core`
  - `@dnd-kit/sortable`
  - `@dnd-kit/utilities`

## Tooling

- ESLint
- TypeScript
- PostCSS
- TailwindCSS
- Next.js App Router architecture

---

# Project Structure

```bash
app/
├── (auth)/                # Authentication layouts
├── (main)/                # Main application pages
├── api/                   # API routes
├── auth/                  # Signup/auth flows

components/
├── boards/                # Board UI
├── comments/              # Comment system
├── feed/                  # Feed + discovery
├── layout/                # App shell/layout
├── modal/                 # Modal system
├── pin/                   # Pin/project UI
├── profile/               # User profile UI
├── search/                # Search experience

lib/
├── auth/                  # Auth utilities
├── db/                    # Database queries/types
├── hooks/                 # Custom React hooks
├── moderation/            # Moderation logic
├── search/                # Search expansion logic
├── supabase/              # Supabase clients/helpers
├── utils/                 # Shared utilities
├── validators/            # Zod validation schemas

supabase/
├── migrations/            # Database schema migrations
Supabase Architecture

Pindev uses Supabase as the full backend platform.

Included Supabase Features
Authentication

Handled through:

@supabase/ssr
@supabase/supabase-js

Supports:

Secure sessions
Server-side auth
Client auth
Protected routes
Persistent login state
Database

PostgreSQL powers:

Users
Pins
Boards
Comments
Likes
Follows
Drafts
Storage

Used for:

Uploaded images
Project media
User assets
Row Level Security

Database-level access control policies ensure:

User ownership protection
Secure edits
Scoped data access
Safe public/private interactions
Database Migrations

Current migration structure includes:

0001_init.sql
0002_storage_policies.sql
0003_follows_blocks.sql
0004_pin_drafts.sql
0005_drop_blocks.sql

These migrations handle:

Initial schema creation
Storage permissions
Follow systems
Draft systems
Access policies
Custom Hook System

Pindev uses modular React hooks for application state and Supabase interaction.

Hooks
useBoards()
useFeed()
usePin()
usePins()

These hooks manage:

Feed loading
Pin state
Board management
Data fetching
Optimistic UI behavior
UI / UX Philosophy

Pindev focuses heavily on modern AI-native UX principles:

Fast interactions
Minimal friction
Discovery-first layouts
Builder-centric profiles
Clean visual hierarchy
Modular component architecture
Social creativity over traditional resumes

The experience takes inspiration from platforms like:

Pinterest
Are.na
GitHub
Cosmos
Dribbble

while tailoring the platform specifically for developers and technical creators.

Local Development
Clone Repository
git clone https://github.com/skylynxf1/pindev.git
cd pindev
Install Dependencies
npm install
Environment Variables

Create a .env.local file:

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
Start Development Server
npm run dev
Build Commands
Development
npm run dev
Production Build
npm run build
Start Production Server
npm run start
Lint
npm run lint
Future Roadmap
AI-powered developer discovery
Semantic project recommendations
Collaborative boards
Team formation features
Real-time messaging
AI-generated project tagging
Portfolio analytics
GitHub synchronization
Hackathon integration
AI learning pathways
Vision

Pindev exists to support the next generation of builders growing alongside AI-assisted development.

As software becomes easier to create, community, creativity, taste, and collaboration become the differentiators.

Pindev aims to become a platform where developers can:

Learn publicly
Build socially
Discover opportunities
Showcase creativity
Connect with other ambitious builders
