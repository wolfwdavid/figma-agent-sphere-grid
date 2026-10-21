<script>
  import { onMount } from "svelte";
  import { layout } from "./nodes.js";
  import { ensureAudio, playNote, INSTRUMENTS, NOTES, TUNES } from "./sound.js";

  const { nodes, edges } = layout();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- state ---------------------------------------------------------------
  let unlocked = new Set(["ideate"]);
  let charging = null;          // edge "from>to" currently filling with energy
  let burst = null;             // node id that just unlocked (one-shot ring)
  let selected = byId.ideate;
  let cam = { x: 0, y: 0, k: 1 };
  let playing = false, playTimer = 0;

  const isAvailable = (n, u) => !u.has(n.id) && (!n.parent || u.has(n.parent));
  $: available = nodes.filter((n) => isAvailable(n, unlocked));
  $: progress = unlocked.size;

  // deterministic starfield so it doesn't reshuffle on every reload
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = Array.from({ length: 140 }, () => ({ x: rnd() * 1600 - 800, y: rnd() * 1600 - 800, r: rnd() * 1.6 + 0.3, d: rnd() * 4 }));
  const rings = [120, 166, 212, 258, 304, 350, 396, 442];

  // ---- sound: nodes are piano keys -----------------------------------------
  let soundOn = true, instrument = "piano", tune = "twinkle", tunePlaying = false, tuneTimers = [];
  let pinged = {};              // node id → counter, re-triggers the ping animation
  function ping(id) {
    pinged = { ...pinged, [id]: (pinged[id] || 0) + 1 };
    if (soundOn) { ensureAudio(); playNote(NOTES[id], instrument); }
  }
  function playTune() {
    stopTune(); if (!soundOn) soundOn = true;
    ensureAudio(); tunePlaying = true;
    const { seq, beat } = TUNES[tune];
    seq.forEach((id, i) => { if (id !== "-") tuneTimers.push(setTimeout(() => ping(id), i * beat * 1000)); });
    tuneTimers.push(setTimeout(() => (tunePlaying = false), seq.length * beat * 1000 + 300));
  }
  function stopTune() { tuneTimers.forEach(clearTimeout); tuneTimers = []; tunePlaying = false; }

  // ---- actions ---------------------------------------------------------------
  function focus(n, k = 1.7) { selected = n; cam = { x: n.x, y: n.y, k }; }
  function overview() { cam = { x: 0, y: 0, k: 1 }; }

  function unlock(n) {
    if (charging || !isAvailable(n, unlocked)) { focus(n); return; }
    focus(n);
    charging = `${n.parent}>${n.id}`;
    setTimeout(() => {
      unlocked = new Set([...unlocked, n.id]);
      charging = null; burst = n.id; ping(n.id);
      setTimeout(() => { if (burst === n.id) burst = null; }, 900);
    }, reduced ? 0 : 650);
  }

  // tapping an unlocked node plays it like a key (camera stays put so you can keep playing)
  function select(n) {
    stop();
    if (isAvailable(n, unlocked)) unlock(n);
    else if (unlocked.has(n.id)) { selected = n; ping(n.id); }
    else focus(n);
  }
  function onKey(e, n) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(n); } }

  // auto-play walks the grid: main path first, branches as they open up
  function play() {
    if (playing) return stop();
    playing = true;
    const step = () => {
      const next = available.find((n) => n.kind === "main") || available[0];
      if (!next) { playing = false; overview(); return; }
      unlock(next);
      playTimer = setTimeout(step, reduced ? 400 : 1300);
    };
    step();
  }
  function stop() { playing = false; clearTimeout(playTimer); }
  function reset() { stop(); unlocked = new Set(["ideate"]); charging = null; burst = null; focus(byId.ideate, 1); }

  onMount(() => {
    // number keys 1–9 play the main path like a keyboard
    const k = (e) => {
      if (e.key === "Escape") { stop(); stopTune(); overview(); }
      const i = Number(e.key) - 1;
      if (e.target.tagName !== "SELECT" && i >= 0 && i < 9) ping(nodes[i].id);
    };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); stop(); };
  });

  const hex = (r) => Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i - Math.PI / 2; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(" ");
  const state = (n, u, c) => (u.has(n.id) ? "on" : c && c.endsWith(">" + n.id) ? "charging" : isAvailable(n, u) ? "open" : "locked");
</script>

<main class:reduced>
  <svg class="grid" viewBox="-640 -640 1280 1280" preserveAspectRatio="xMidYMid meet" aria-label="Skill grid of the Build with Agent motion workflow">
    <defs>
      <radialGradient id="core" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="35%" stop-color="var(--energy)" />
        <stop offset="100%" stop-color="var(--primary)" />
      </radialGradient>
      <radialGradient id="vignette" r="70%">
        <stop offset="40%" stop-color="#05060f" stop-opacity="0" />
        <stop offset="100%" stop-color="#05060f" stop-opacity=".9" />
      </radialGradient>
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <!-- parallax: stars move at 40% of the camera -->
    <g class="cam" style="transform: translate({-cam.x * cam.k * 0.4}px, {-cam.y * cam.k * 0.4}px)">
      {#each stars as s}<circle class="star" cx={s.x} cy={s.y} r={s.r} style="animation-delay:-{s.d}s" />{/each}
    </g>

    <g class="cam" style="transform: translate({-cam.x * cam.k}px, {-cam.y * cam.k}px) scale({cam.k})">
      <g class="rings">{#each rings as r}<circle {r} />{/each}</g>

      {#each edges as e}
        {@const a = byId[e.from]}{@const b = byId[e.to]}
        {@const lit = unlocked.has(e.to)}
        <line class="edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        {#if charging === `${e.from}>${e.to}`}
          <line class="edge charge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} pathLength="1" filter="url(#glow)" />
        {:else if lit}
          <line class="edge lit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
          <line class="edge flow" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        {/if}
      {/each}

      {#each nodes as n (n.id)}
        {@const st = state(n, unlocked, charging)}
        {@const r = n.kind === "main" ? 24 : 17}
        <g class="node {st} {n.kind}" class:sel={selected === n} transform="translate({n.x} {n.y})"
           role="button" tabindex="0" aria-label="{n.title}, {st === 'on' ? 'unlocked' : st === 'open' ? 'available, press to unlock' : 'locked'}"
           on:click={() => select(n)} on:keydown={(e) => onKey(e, n)}>
          <circle class="hit" r="40" />
          <circle class="halo" r={r + 16} />
          <polygon class="crystal" points={hex(r)} filter={st === "on" ? "url(#glow)" : null} />
          <polygon class="facet" points={hex(r * 0.5)} />
          {#if burst === n.id}<circle class="burst" r={r} />{/if}
          {#key pinged[n.id]}{#if pinged[n.id]}<circle class="ping" r={r} />{/if}{/key}
          {#if n.step}<text class="num" dy="5">{n.step}</text>{/if}
          <text class="label" y={r + 22}>{n.title}</text>
        </g>
      {/each}
    </g>
    <rect x="-640" y="-640" width="1280" height="1280" fill="url(#vignette)" pointer-events="none" />
  </svg>

  <header>
    <p class="eyebrow">Build with Figma Agent NYC · Workshop</p>
    <h1>Figma Agent Sphere Grid</h1>
    <p class="meter" aria-live="polite"><span style="width:{(progress / nodes.length) * 100}%"></span></p>
    <p class="count">{progress} / {nodes.length} nodes</p>
  </header>

  <aside class="panel" aria-live="polite">
    {#key selected.id}
      <div class="card">
        <p class="eyebrow">{selected.kind === "main" ? `Step ${selected.step}` : `Branch of ${byId[selected.parent].title}`}</p>
        <h2>{selected.title}</h2>
        <p class="body">{selected.body}</p>
        {#if unlocked.has(selected.id)}
          <p class="status on">Unlocked</p>
        {:else if isAvailable(selected, unlocked)}
          <button class="primary" on:click={() => select(selected)} disabled={!!charging}>Unlock node</button>
        {:else}
          <p class="status">Locked: unlock {byId[selected.parent].title} first</p>
        {/if}
      </div>
    {/key}
    <div class="music card">
      <label>Instrument
        <select bind:value={instrument} on:change={() => ping(selected.id)}>
          {#each Object.entries(INSTRUMENTS) as [id, ins]}<option value={id}>{ins.label}</option>{/each}
        </select>
      </label>
      <label>Tune
        <select bind:value={tune}>
          {#each Object.entries(TUNES) as [id, t]}<option value={id}>{t.label}</option>{/each}
        </select>
      </label>
      <div class="controls">
        <button on:click={() => (tunePlaying ? stopTune() : playTune())} aria-pressed={tunePlaying}>{tunePlaying ? "Stop tune" : "Play tune"}</button>
        <button on:click={() => (soundOn = !soundOn)} aria-pressed={soundOn}>Sound: {soundOn ? "on" : "off"}</button>
      </div>
      <p class="hint">Tap unlocked nodes or press 1–9 to play them like keys.</p>
    </div>
    <div class="controls">
      <button on:click={play} aria-pressed={playing}>{playing ? "Pause" : "Auto-play"}</button>
      <button on:click={() => { stop(); overview(); }}>Overview</button>
      <button on:click={reset}>Reset</button>
    </div>
  </aside>
</main>

<style>
  :global(:root) {
    --bg: #05060f; --surface: rgba(14, 17, 38, .78); --border: rgba(148, 163, 255, .18);
    --fg: #f8fafc; --muted: #a5adc9; --primary: #6d5bff; --energy: #22d3ee; --locked: #2b3350;
    --ease: cubic-bezier(.2, .8, .2, 1);
  }
  :global(html, body) { margin: 0; height: 100%; background: var(--bg); color: var(--fg); font-family: Inter, system-ui, sans-serif; overflow: hidden; }
  :global(*) { box-sizing: border-box; }
  main { position: relative; height: 100dvh; width: 100vw; }

  .grid { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: manipulation; }
  .cam { transition: transform .9s var(--ease); }
  .star { fill: #c7d2fe; animation: twinkle 4s ease-in-out infinite alternate; }
  @keyframes twinkle { from { opacity: .25 } to { opacity: .9 } }
  .rings { fill: none; stroke: rgba(109, 91, 255, .09); stroke-width: 1; animation: spin 240s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg) } }

  .edge { stroke: var(--locked); stroke-width: 2; stroke-linecap: round; }
  .edge.lit { stroke: var(--primary); stroke-width: 3; opacity: .8; }
  .edge.flow { stroke: var(--energy); stroke-width: 2.5; stroke-dasharray: 3 16; animation: flow 1.2s linear infinite; }
  @keyframes flow { to { stroke-dashoffset: -19 } }
  .edge.charge { stroke: var(--energy); stroke-width: 5; stroke-dasharray: 1; stroke-dashoffset: 1; animation: charge .65s var(--ease) forwards; }
  @keyframes charge { to { stroke-dashoffset: 0 } }

  .node { cursor: pointer; outline: none; }
  .hit { fill: transparent; }
  .halo { fill: var(--primary); opacity: 0; transition: opacity .3s; }
  .crystal { fill: #0b1020; stroke: var(--locked); stroke-width: 2; transition: fill .3s, stroke .3s, transform .3s var(--ease); }
  .facet { fill: none; stroke: rgba(255, 255, 255, .08); stroke-width: 1.5; }
  .num { fill: var(--muted); font: 700 14px Inter, sans-serif; text-anchor: middle; pointer-events: none; }
  .label { fill: var(--muted); font: 600 15px Inter, sans-serif; text-anchor: middle; pointer-events: none; paint-order: stroke; stroke: var(--bg); stroke-width: 5px; }
  .branch .label { font-size: 13px; }

  .node.open .crystal { stroke: var(--primary); animation: beckon 1.6s ease-in-out infinite; }
  .node.open .halo { opacity: .14; animation: breathe 1.6s ease-in-out infinite; }
  @keyframes beckon { 50% { stroke: var(--energy) } }
  @keyframes breathe { 50% { opacity: .3 } }
  .node.charging .crystal { stroke: var(--energy); }
  .node.on .crystal { fill: url(#core); stroke: #e0e7ff; }
  .node.on .facet { stroke: rgba(255, 255, 255, .6); }
  .node.on .num { fill: #05060f; }
  .node.on .label { fill: var(--fg); }
  .node.on .halo { opacity: .22; }
  .node:hover .crystal, .node:focus-visible .crystal { transform: scale(1.12); }
  .node:focus-visible .halo { opacity: .5; fill: var(--energy); }
  .node.sel .label { fill: var(--energy); }
  .burst { fill: none; stroke: var(--energy); stroke-width: 3; transform-box: fill-box; transform-origin: center; animation: burst .9s var(--ease) forwards; }
  .ping { fill: var(--energy); opacity: 0; transform-box: fill-box; transform-origin: center; animation: ping .6s var(--ease); pointer-events: none; }
  @keyframes ping { from { transform: scale(.8); opacity: .75 } to { transform: scale(2.2); opacity: 0 } }
  .music { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px; }
  .music .controls, .music .hint { grid-column: 1 / -1; }
  .music label { display: grid; gap: 4px; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  select { min-height: 44px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: #0b1020; color: var(--fg); font: 500 15px Inter, sans-serif; cursor: pointer; }
  select:focus-visible { outline: 3px solid var(--energy); outline-offset: 2px; }
  .hint { margin: 0; font-size: 13px; color: var(--muted); }
  @keyframes burst { from { transform: scale(1); opacity: 1 } to { transform: scale(3.4); opacity: 0 } }

  header { position: absolute; top: max(16px, env(safe-area-inset-top)); left: 16px; right: 16px; pointer-events: none; }
  .eyebrow { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--energy); }
  h1 { margin: 4px 0 10px; font-size: clamp(26px, 4vw, 40px); font-weight: 800; letter-spacing: -.02em; text-shadow: 0 0 24px rgba(109, 91, 255, .6); }
  .meter { width: min(260px, 60vw); height: 6px; margin: 0; border-radius: 99px; background: rgba(255, 255, 255, .08); overflow: hidden; }
  .meter span { display: block; height: 100%; background: linear-gradient(90deg, var(--primary), var(--energy)); transition: width .6s var(--ease); }
  .count { margin: 6px 0 0; font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }

  .panel { position: absolute; right: 16px; bottom: max(16px, env(safe-area-inset-bottom)); width: min(360px, calc(100vw - 32px)); display: grid; gap: 10px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px; backdrop-filter: blur(14px); animation: rise .3s var(--ease); }
  @keyframes rise { from { opacity: 0; transform: translateY(8px) } }
  h2 { margin: 4px 0 6px; font-size: 22px; }
  .body { margin: 0 0 14px; font-size: 16px; line-height: 1.55; color: #d6dbf0; }
  .status { margin: 0; font-size: 14px; color: var(--muted); }
  .status.on { color: var(--energy); font-weight: 600; }
  .controls { display: flex; gap: 8px; }
  button { flex: 1; min-height: 44px; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--fg); font: 600 14px Inter, sans-serif; cursor: pointer; transition: transform .15s, background .2s, border-color .2s; backdrop-filter: blur(14px); }
  button:hover { border-color: var(--primary); }
  button:active { transform: scale(.97); }
  button:focus-visible { outline: 3px solid var(--energy); outline-offset: 2px; }
  button[aria-pressed="true"] { border-color: var(--energy); color: var(--energy); }
  button.primary { width: 100%; background: linear-gradient(90deg, var(--primary), #4f8cff); border: 0; color: #fff; }
  button:disabled { opacity: .5; cursor: progress; }

  @media (max-width: 640px) { .label { font-size: 18px; } .branch .label { font-size: 16px; } }
  main.reduced .cam, main.reduced .rings, main.reduced .star, main.reduced .edge.flow, main.reduced .node.open .crystal, main.reduced .node.open .halo { animation: none; transition: none; }
</style>
