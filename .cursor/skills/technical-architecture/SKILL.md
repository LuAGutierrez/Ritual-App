---
name: technical-architecture
description: Provides the full technical architecture, stack, database schema, and system design for Rituales. Use when making implementation decisions, designing database models, structuring frontend code, setting up Supabase, planning realtime features, or whenever technical context about how Rituales is built is needed.
disable-model-invocation: true
---

# Rituales — Technical Architecture

## Core Stack

Frontend:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

Backend:
- Supabase

Infrastructure:
- Vercel
- GitHub

---

# Architecture Principles

## 1. Mobile-First
All UI and flows must prioritize mobile usability.

## 2. Scalable Simplicity
Avoid premature complexity.

## 3. Fast Interactions
Target lightweight and responsive UX.

## 4. Reusable Components
Build composable design systems.

---

# Core System Modules

## Authentication
Use:
- Google auth

Users should easily connect with partners.

---

## Couple Linking System

Core entity:
- Couple

Relationships:
- User belongs to a Couple
- Couple has shared rituals
- Couple shares streaks/history

---

# Suggested Database Structure
Always check if there is a structure actually and work around that or do recommendations.

## users
- id
- username
- avatar
- created_at

## couples
- id
- invite_code
- created_at

## couple_members
- user_id
- couple_id

## rituals
- id
- category
- prompt
- challenge
- difficulty
- premium
- created_at

## ritual_responses
- id
- ritual_id
- user_id
- response
- created_at

## streaks
- couple_id
- current_streak
- longest_streak
- last_completed_at

---

# Backend Requirements

Use Supabase for:
- auth,
- postgres database,
- realtime sync,
- edge functions,
- storage,
- notifications.

---

# Frontend Structure

Recommended structure:

```
/app
/components
/features
/lib
/hooks
/services
/types
/styles
```

---

# Realtime Features

Use realtime for:
- synchronized ritual completion,
- live answer reveals,
- shared interactions,
- streak updates.

---

# Analytics

Track:
- ritual completion,
- streak retention,
- partner invite conversion,
- session duration,
- emotional category engagement,
- premium conversion.

---

# Without notifications
