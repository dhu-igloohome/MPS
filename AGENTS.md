<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI principles (read `docs/ui-design-principles.md` before touching any UI)

1. **Avoid unnecessary helper labels and explanations.** Default to none; add one only if leaving it out would lead the user to a wrong decision or wrong data (metric definitions, destructive actions, concrete error messages). Never delete `aria-label` / `title` accessibility text.
2. **Let the layout do the explaining** — grouping, order, alignment, defaults, colour and empty states, not paragraphs. If a page needs a paragraph to be understood, fix the layout instead.

Focus effort on UI and interaction. Clean up only the page you are editing; no site-wide sweeps. Desktop only.
