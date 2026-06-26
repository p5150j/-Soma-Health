# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Server

```bash
npm run dev -- -p 3000   # always use port 3000
npm run build
npm run lint
```

## Stack

- **Next.js 16.2.9** (App Router) — APIs may differ from training data. Check `node_modules/next/dist/docs/` if uncertain about a Next.js API.
- **Tailwind CSS v4** — no `tailwind.config.js`. All tokens and custom utilities live in `src/app/globals.css` under `@theme inline {}` and `@layer utilities {}`. Edit tokens there, not in a config file.
- **TypeScript strict mode** — path alias `@/*` → `src/*`
- **Three.js** via `@react-three/fiber` + `@react-three/drei` for the 3D body viewer

## Component Location

Components live in `src/components/`, not `src/app/`. The main layout is `src/app/page.tsx`.

## Design Rules (non-negotiable)

- **No inline `style={{}}` props** — Tailwind classes only. Custom values go in `globals.css`.
- **Only change what is explicitly asked** — never add unrequested visual treatments. Verify against ref images in `ref_images/` before adding anything new.

## Design Tokens

Defined in `globals.css`:
- `bg-lime` / `text-lime` → `#3EFFC0` (primary accent)
- `text-red-alert` / `bg-red-alert` → `#ff453a`
- `text-yellow-warn` / `bg-yellow-warn` → `#f5a623`
- `.glass-panel` — standard dark glassmorphic card (use this for all floating panels)

## Glass System

All glass surfaces use the same treatment — `.glass-panel` class + Tailwind blur utilities on the element:

```tsx
className="glass-panel backdrop-blur-[40px] backdrop-saturate-150"
```

- `.glass-panel` is defined in `globals.css` — provides bg, border, border-radius, box-shadow
- **Never put `backdrop-filter` directly in `globals.css` custom classes** — Tailwind v4 strips the `backdrop-filter` shorthand from custom CSS. Always apply blur via Tailwind utility classes in JSX.
- Footer nav and all cards use identical values: `rgba(18,18,20,0.55)` bg, `blur(40px)`, `saturate(150)`

## Z-Index Stack — CRITICAL

The WebGL canvas GPU-composites above HTML elements unless explicitly controlled. The stacking setup in `page.tsx` is load-bearing — do not change without understanding it:

```
canvas wrapper:        z-0   (explicit — prevents WebGL from floating above panels)
annotation portal:     z-5   (above canvas, below panels)
panels wrapper:        z-10  + [transform:translate3d(0,0,0)]  (forces own GPU compositor layer)
top nav / footer:      z-50
```

The `[transform:translate3d(0,0,0)]` on the panels wrapper is **required** — it promotes panels to their own GPU compositor layer so they render above the WebGL canvas. Removing it causes the skeleton to bleed through all glass cards.

## 3D Skeleton — Bone Targeting

The GLTF model at `public/skeleton/skeleton_lo.glb` has individually named meshes for every bone. The mesh naming convention is `<bone-name>_beige_0`, e.g.:

```
r_clavicle_beige_0    l_clavicle_beige_0
r_rib1_beige_0        l_rib1_beige_0  (ribs 1–12 each side)
Cranium_beige_0       Mandible_beige_0
t1_beige_0 … t12_beige_0   (thoracic vertebrae)
c1_beige_0 … c7_beige_0    (cervical)
l1_beige_0 … l5_beige_0    (lumbar)
r_femur_beige_0       l_femur_beige_0
Sternum_beige_0       Sacrum_beige_0
```

Full node list is at `skeleton-nodes.json` in the project root.

To highlight a specific bone, match by `child.name` inside the `scene.traverse()` call in `src/components/BodyViewer.tsx` and apply a separate `MeshBasicMaterial`. Collect meshes first into an array before modifying — do NOT modify inside `traverse()` to avoid infinite recursion.

## Bone Annotations

Annotations are compact glass cards rendered via `@react-three/drei` `<Html>` component, portalled into `#bone-annotation-portal`. They sit at `z-5` — above the canvas, below the panels. Design: `w-[140px]`, `glass-panel backdrop-blur-[40px] backdrop-saturate-150`, two rows (name + severity / condition label).

## Reference Images

Visual design references are in `ref_images/`. Always compare against them before reporting UI work as complete.
