# ADR-0015: DOM/CSS rendering engine for templates

## Status
Accepted

## Context
The architecture document lists "Template Rendering Engine" as Not-yet-
specified: HTML/CSS DOM canvas vs WebGL/Pixi.js (§8). The choice affects the
editor preview, the player, and every in-card thumbnail — they must render
identically, or pixel-level layout is meaningless.

## Decision
Render every template as a 1920×1080 logical canvas containing absolutely
positioned HTML elements (one `<div>` per layer), scaled to fit its container
with a CSS `transform: scale()`. The editor live-renders the same component as
the fullscreen player and the thumbnails.

## Consequences
- + Crisp text at any zoom; CSS gives outlines/shadows/border-radius free.
- + One component (`TemplateStage`) is the single source of truth for preview,
  player, and thumbnails — no engine divergence.
- + IFIMS chips, status colour-mapping, and the ticking clock are plain
  React, so live re-render is trivial.
- - No GPU acceleration; fine for one 1080p frame on a Mini PC (a single
  frame, not video).
- - JPEG/WebP uploads are stored as data URLs in the layout; acceptable for a
  mockup, revisited when a media store exists.