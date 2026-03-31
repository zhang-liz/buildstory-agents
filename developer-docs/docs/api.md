---
sidebar_position: 5
---

# API reference

Base URL is your deployment origin (for local dev, `http://localhost:3000`). All bodies are JSON unless noted.

## `POST /api/story`

Creates a story and generates initial storyboard content.

**Body**

```json
{
  "brief": "Product description",
  "tone": "professional",
  "brandName": "Your Brand",
  "palette": ["#3b82f6", "#1e40af", "#64748b"]
}
```

## `POST /api/rewrite`

Requests an optimized or fresh variant for a section.

**Body**

```json
{
  "storyId": "uuid",
  "sectionKey": "hero",
  "goal": "conversion",
  "optimize": true
}
```

Rate limiting uses Redis when Upstash env vars are set; otherwise an in-memory limiter applies.

## `POST /api/track`

Records analytics and optimization events.

**Body**

```json
{
  "storyId": "uuid",
  "sectionKey": "hero",
  "variantHash": "abc123",
  "event": "ctaClick",
  "meta": {"ctaIndex": 0}
}
```

## `GET /api/debug`

Returns environment and dependency health information suitable for operators (avoid exposing in untrusted production contexts without access control).

## `GET /s/[storyId]`

Server-rendered landing page. Supports persona override via `?persona=` query parameter (see repository README for allowed values).
