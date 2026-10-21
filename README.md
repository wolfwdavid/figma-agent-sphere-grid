# Figma Agent Sphere Grid

Workshop build for **Build with Figma Agent NYC**: the "Motion piece" workflow from the event's Figma file as an animated, playable node grid.

- **Unlock** nodes along *Ideate → Prompt → Follow up → Adjust + build → Animate + play → Experiment + iterate → Preview → Export → Submit*; branches (Figma Agent, Shader fills/effects, Figma Motion, Tools, AI use, Current limits) open as you go.
- **Play it like a piano**: every node is a key (main path = C major scale up the spiral, branches = low chord tones). Tap unlocked nodes or press `1`–`9`.
- **Instruments**: Piano, Crystal (FM bell), Synth, Music box, all synthesized live with the Web Audio API (no samples).
- **Tunes**: Ascend, Twinkle Twinkle, Ode to Joy (public domain), Crystal cascade; the grid lights up as they play.
- **Auto-play** walks the grid · **Overview** / `Esc` zooms out · respects `prefers-reduced-motion`.

```bash
npm install
npm run dev     # http://localhost:5173/figma-agent-sphere-grid/
```

Stack: Svelte 4 + Vite + SVG/CSS + Web Audio, all free and open source. Deploy with `npm run deploy` (publishes `dist/` to the `gh-pages` branch).
