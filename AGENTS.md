<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Tailwind v4 Gotchas

- **No `backdrop-filter` in custom CSS classes** — Tailwind v4 strips the `backdrop-filter` shorthand from anything inside `@layer utilities` or unlayered CSS. Only `-webkit-backdrop-filter` survives. Always apply blur via Tailwind utility classes in JSX: `backdrop-blur-[40px] backdrop-saturate-150`.
- **No `tailwind.config.js`** — tokens live in `globals.css` under `@theme inline {}`.
- **`@layer utilities` for custom classes** — but do not put `backdrop-filter`, `filter`, or other properties Tailwind owns there.

## WebGL + HTML Stacking

The Three.js canvas will GPU-composite above all HTML elements unless:
1. The canvas wrapper has an explicit `z-0`
2. HTML panels have `[transform:translate3d(0,0,0)]` to force their own compositor layer

This is already set up in `page.tsx`. Do not remove these without understanding the consequence — the skeleton will bleed through all glass panels.

## Debugging Layout Issues

When something looks visually wrong (elements behind/in-front of wrong things, blur not visible):
1. First make suspect elements `bg-black border-2 border-red-500` to confirm they render at all and where
2. Then diagnose stacking — do not chase CSS property values until you know the element is in the right layer
