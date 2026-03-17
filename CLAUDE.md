# Smartbot v2 — Claude working rules

## General
- This repo contains a backend-complete AI assistant SaaS platform plus a separate embeddable widget.
- Figma is the visual source of truth for all frontend implementation.
- Always read docs before coding.
- Preserve existing architecture and shared patterns.
- Do not redesign the shell or invent new styles without strong reason.
- Prefer reusable components over one-off implementations.

## Required docs to read before frontend work
- docs/backend-api-reference.md
- docs/figma-screen-spec.md
- docs/STITCH-PROMPTS.md
- docs/frontend-architecture.md
- docs/frontend-ui-rules.md
- docs/frontend-design-system.md
- docs/widget-architecture.md
- docs/widget-design-system.md


## Platform rules
- smartbot-web is the admin SaaS app.
- Keep desktop-first SaaS layout consistency.
- Reuse shell, sidebar, page header, cards, tabs, tables, forms, dialogs, banners.
- Vietnamese UI copy by default.
- Every page must handle loading, empty, error, and success states.

## Widget rules
- smartbot-widget is independent from smartbot-web.
- Optimize for embeddability, isolation, and low integration friction.
- Avoid assumptions about host framework.
- Keep widget bundle small.
- Prefer Shadow DOM or equivalent isolation strategy.
- Do not share large dashboard components with widget.

## Workflow rules
- Work in phases.
- After each module, create QA evidence docs.
- Before declaring production-ready, run Reality Checker.