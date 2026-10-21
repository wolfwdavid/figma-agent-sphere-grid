// The "Motion piece" workflow from the Build with Agent NYC Figma file, laid out as a growth grid.
// Main path spirals out from the centre; side topics branch off the step they belong to.
export const MAIN = [
  { id: "ideate", title: "Ideate", body: "Find a visual reference, or just write a description of what you'd like to create." },
  { id: "prompt", title: "Prompt", body: "Prompt the agent with your visual reference and a clear description of the shader you want." },
  { id: "follow", title: "Follow up", body: "Answer the agent's questions and steer it toward the look you have in mind." },
  { id: "adjust", title: "Adjust + build", body: "Adjust the frame and layers, then let the agent build the shader fill or effect." },
  { id: "animate", title: "Animate + play", body: "Add motion: animate the shader's properties and press play to see it move." },
  { id: "iterate", title: "Experiment + iterate", body: "Remix colours, speed and effects. Small prompts, fast loops, keep what works." },
  { id: "preview", title: "Preview", body: "Preview the motion piece in the timeline and polish the timing." },
  { id: "export", title: "Export", body: "Export your piece as video or frames, ready to share." },
  { id: "submit", title: "Submit your work", body: "Share the final piece with the Build with Agent NYC community." },
];

export const BRANCHES = [
  { id: "agent", parent: "prompt", side: -1, title: "Figma Agent", body: "The AI agent inside Figma that turns your prompt into layers, fills and effects." },
  { id: "fills", parent: "adjust", side: -1, title: "Shader fills", body: "Procedural fills (gradients, noise, kaleidoscopes) generated as live shaders." },
  { id: "effects", parent: "adjust", side: 1, title: "Shader effects", body: "Post effects such as glow, blur, grain and distortion applied on top of a layer." },
  { id: "motion", parent: "animate", side: 1, title: "Figma Motion", body: "Timeline-based animation in Figma: keyframes, easing and playback." },
  { id: "tools", parent: "iterate", side: -1, title: "Tools", body: "Community plugins and MCP tools that extend what the agent can do." },
  { id: "ai", parent: "iterate", side: 1, title: "AI use", body: "Building and editing shaders with the agent, plus tips for prompting it well." },
  { id: "limits", parent: "export", side: 1, title: "Current limits", body: "Know the edges: resolution caps and export formats are still evolving." },
];

const deg = Math.PI / 180;
export function layout() {
  const nodes = [];
  MAIN.forEach((n, i) => {
    const a = (-90 + i * 74) * deg, r = i === 0 ? 0 : 120 + (i - 1) * 46;
    nodes.push({ ...n, kind: "main", step: i + 1, x: Math.cos(a) * r, y: Math.sin(a) * r, parent: i ? MAIN[i - 1].id : null });
  });
  for (const b of BRANCHES) {
    const p = nodes.find((n) => n.id === b.parent);
    const a = Math.atan2(p.y, p.x) + b.side * 38 * deg;
    nodes.push({ ...b, kind: "branch", x: p.x + Math.cos(a) * 118, y: p.y + Math.sin(a) * 118 });
  }
  const edges = nodes.filter((n) => n.parent).map((n) => ({ from: n.parent, to: n.id }));
  return { nodes, edges };
}
