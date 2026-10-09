/**
 * Reproducible benchmarks. Writes machine-readable results to benchmarks/results/latest.json.
 * The website and README read numbers ONLY from that file. Run: npm run bench
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import type { RawEvent } from "../src/core/contracts";
import { generateSeed } from "../src/core/seed/generate";
import { PROSPECTS, companyByKey, handleFor } from "../src/core/seed/universe";
import { createRng } from "../src/core/lib/rng";
import { ingest } from "../src/core/ingest/pipeline";
import { resolveIdentities } from "../src/core/identity/resolve";
import { projectGraph, graphChecksum } from "../src/core/graph/project";
import { buildAdjacency, findWarmPaths } from "../src/core/graph/warmPaths";
import { buildWorkspace, accountTimeline } from "../src/core/workspace";
import { runEvals } from "../src/core/agents/evals";
import { FAILURES, runScenario } from "../src/core/integrations/scenarios";

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]!;
};
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const time = <T>(fn: () => T) => {
  const t = performance.now();
  const v = fn();
  return { v, ms: performance.now() - t };
};

/** 10k-event corpus: seed + synthetic engagement, with 5% duplicate deliveries and 1% invalid payloads. */
function expandedCorpus(target = 10_000) {
  const { rawEvents, posts } = generateSeed();
  const rng = createRng(99);
  const out: RawEvent[] = [...rawEvents];
  let i = 0;
  while (out.length < target) {
    i++;
    if (rng.chance(0.05) && out.length > 300) {
      out.push({ ...out[rng.int(300, out.length - 1)]! });
      continue;
    }
    const p = rng.pick(PROSPECTS);
    const post = rng.pick(posts);
    const invalid = rng.chance(0.01);
    out.push({
      provider: "social",
      providerEventId: `bench_${i}`,
      kind: rng.chance(0.2) ? "comment.created" : "reaction.like",
      receivedAt: new Date(Date.UTC(2026, 6, 3) + i * 60_000).toISOString(),
      payload: { postId: invalid ? 42 : post.id, actor: { handle: handleFor(p), name: p.name, company: companyByKey(p.company).name }, commentId: `bench_c_${i}`, text: "Synthetic benchmark comment." },
    });
  }
  return out;
}

async function collect() {
  const seed = generateSeed().rawEvents;
  const corpus = expandedCorpus();

  // 1. Event ingestion (10k): ingest + normalize + identity resolution
  const ingRuns = Array.from({ length: 5 }, () => time(() => resolveIdentities(ingest(corpus).normalized)));
  const ing = ingest(corpus);
  const ingestion = {
    events: corpus.length,
    normalized: ing.stats.normalized,
    duplicates: ing.stats.duplicates,
    dead_letters: ing.stats.deadLetters,
    median_ms: round(pct(ingRuns.map((r) => r.ms), 50), 1),
    events_per_sec: Math.round(corpus.length / (pct(ingRuns.map((r) => r.ms), 50) / 1000)),
  };

  // 2. Graph projection rebuild from normalized events
  const { directory, resolved } = resolveIdentities(ing.normalized);
  const projRuns = Array.from({ length: 5 }, () => time(() => projectGraph(resolved, directory)));
  const g = projRuns[0]!.v;
  const projection = { normalized_events: resolved.length, nodes: g.nodes.size, edges: g.edges.size, median_ms: round(pct(projRuns.map((r) => r.ms), 50), 1) };

  // 3. Warm-path P95 over 500 queries (seed graph and 10k-event graph)
  const ws = buildWorkspace(seed);
  const warm = (graph: typeof g, dir: typeof directory, events: typeof resolved) => {
    const adjacency = buildAdjacency(graph);
    const targets = [...dir.companies.values()].filter((c) => c.isTarget);
    const rng = createRng(5);
    const ms: number[] = [];
    for (let q = 0; q < 500; q++) {
      const c = rng.pick(targets);
      ms.push(time(() => findWarmPaths(graph, dir, events, c.id, { adjacency })).ms);
    }
    return { queries: 500, p50_ms: round(pct(ms, 50)), p95_ms: round(pct(ms, 95)), max_ms: round(Math.max(...ms)) };
  };
  const warmPaths = { seed_graph: warm(ws.graph, ws.directory, ws.resolved), expanded_graph: warm(g, directory, resolved) };

  // 4. Account page read-model compute P95 (in-process; excludes network + rendering)
  const acctMs: number[] = [];
  for (let r = 0; r < 20; r++)
    for (const a of ws.accounts) {
      acctMs.push(
        time(() => {
          accountTimeline(ws, a.company.id);
          if (a.opportunity) ws.attributionFor(a.opportunity, "graph_assisted");
          return ws.warmPaths.get(a.company.id);
        }).ms,
      );
    }
  const accountPage = { samples: acctMs.length, p50_ms: round(pct(acctMs, 50)), p95_ms: round(pct(acctMs, 95)), note: "in-process read-model compute; excludes network and React rendering" };
  const fullBuild = Array.from({ length: 5 }, () => time(() => buildWorkspace(seed)).ms);

  // 5. Replay determinism
  const a = buildWorkspace(seed);
  const b = buildWorkspace(seed);
  const doubled = buildWorkspace([...seed, ...seed]);
  const c1 = graphChecksum(projectGraph(resolveIdentities(ingest(corpus).normalized).resolved, resolveIdentities(ingest(corpus).normalized).directory));
  const replay = {
    seed_graph_checksum: a.checksum,
    seed_checksums_equal: a.checksum === b.checksum && a.normalizedChecksum === b.normalizedChecksum,
    replay_twice_duplicate_normalized: doubled.resolved.length - a.resolved.length,
    replay_twice_checksum_equal: doubled.checksum === a.checksum,
    expanded_checksum_equal: c1 === graphChecksum(g),
  };

  // 6. Agent eval
  const ev = await runEvals(ws);
  const agent = { total: ev.total, passed: ev.passed, suites: ev.suites, planner: "rule-based deterministic planner (no LLM in the loop)" };

  // 7. Connector failure recovery
  const scen = [];
  for (const f of FAILURES) {
    const r = await runScenario(f, seed);
    scen.push({ kind: f, assertions: r.assertions.length, passed: r.assertions.filter((x) => x.passed).length, outcome: r.outcome });
  }

  // 8. Test suite (counts come from the runner, never typed by hand)
  let tests = { total: 0, passed: 0, files: 0 };
  try {
    const file = path.join(os.tmpdir(), `grow-vitest-${process.pid}.json`);
    execSync(`npx vitest run --reporter=json --outputFile=${file}`, { stdio: "ignore" });
    const j = JSON.parse(readFileSync(file, "utf8"));
    tests = { total: j.numTotalTests, passed: j.numPassedTests, files: j.testResults.length };
  } catch (e) {
    console.error("test run failed", e);
  }

  let commit = "uncommitted";
  try {
    commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {}

  const result = {
    generated_at: new Date().toISOString(),
    commit,
    environment: { node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model ?? "unknown", cores: os.cpus().length },
    seed: { raw_events: seed.length, target_accounts: ws.targets.length, people: [...ws.directory.people.values()].filter((p) => !p.id.startsWith("per_h_")).length, posts: ws.posts.length, engagements: ws.resolved.filter((e) => e.type === "person_liked_post" || e.type === "person_commented_post").length, meetings: ws.meetings.length, opportunities: ws.opportunities.length, closed_won: ws.opportunities.filter((o) => o.stage === "closed_won").length, graph_nodes: ws.graph.nodes.size, graph_edges: ws.graph.edges.size, workspace_build_median_ms: round(pct(fullBuild, 50), 1) },
    ingestion,
    projection,
    warm_paths: warmPaths,
    account_page: accountPage,
    replay,
    agent_eval: agent,
    failure_recovery: scen,
    tests,
  };
  return result;
}

async function main() {
  const result = await collect();
  mkdirSync("benchmarks/results", { recursive: true });
  writeFileSync("benchmarks/results/latest.json", JSON.stringify(result, null, 2) + "\n");
  writeFileSync("docs/BENCHMARKS.md", renderMarkdown(result));
  console.log(JSON.stringify(result, null, 2));
}

type BenchResult = Awaited<ReturnType<typeof collect>>;

function renderMarkdown(r: BenchResult) {
  const row = (...c: (string | number)[]) => `| ${c.join(" | ")} |`;
  return [
    "# Benchmarks",
    "",
    `> Generated by \`npm run bench\` from \`benchmarks/results/latest.json\` — do not edit by hand.`,
    `> ${r.generated_at} · commit \`${r.commit}\` · ${r.environment.cpu} (${r.environment.cores} cores) · Node ${r.environment.node}`,
    "",
    "## Seed corpus",
    "",
    row("Raw events", "Accounts", "People", "Posts", "Engagements", "Meetings", "Opps / won", "Nodes / edges"),
    row("---", "---", "---", "---", "---", "---", "---", "---"),
    row(r.seed.raw_events, r.seed.target_accounts, r.seed.people, r.seed.posts, r.seed.engagements, r.seed.meetings, `${r.seed.opportunities} / ${r.seed.closed_won}`, `${r.seed.graph_nodes} / ${r.seed.graph_edges}`),
    "",
    "## Throughput and latency (in-process reference implementation)",
    "",
    row("Benchmark", "Result", "Method"),
    row("---", "---", "---"),
    row("Event ingestion", `${r.ingestion.median_ms} ms (${r.ingestion.events_per_sec.toLocaleString("en-US")} ev/s)`, `${r.ingestion.events} events, ${r.ingestion.duplicates} dupes, ${r.ingestion.dead_letters} invalid; median of 5`),
    row("Graph projection rebuild", `${r.projection.median_ms} ms`, `${r.projection.normalized_events} normalized events → ${r.projection.nodes} nodes / ${r.projection.edges} edges`),
    row("Warm path P95 (seed)", `${r.warm_paths.seed_graph.p95_ms} ms`, "500 queries"),
    row("Warm path P95 (10k graph)", `${r.warm_paths.expanded_graph.p95_ms} ms`, "500 queries"),
    row("Account read model P95", `${r.account_page.p95_ms} ms`, r.account_page.note),
    row("Full workspace build", `${r.seed.workspace_build_median_ms} ms`, "seed corpus, median of 5"),
    "",
    "## Correctness",
    "",
    row("Check", "Result"),
    row("---", "---"),
    row("Graph checksum", `\`${r.replay.seed_graph_checksum}\``),
    row("Two builds identical", r.replay.seed_checksums_equal ? "yes" : "NO"),
    row("Duplicate normalized events after replaying everything twice", r.replay.replay_twice_duplicate_normalized),
    row("Checksum unchanged after double replay", r.replay.replay_twice_checksum_equal ? "yes" : "NO"),
    row("Agent eval", `${r.agent_eval.passed}/${r.agent_eval.total} (${r.agent_eval.planner})`),
    ...r.agent_eval.suites.map((s) => row(`  · ${s.suite}`, `${s.passed}/${s.total}`)),
    ...r.failure_recovery.map((f) => row(`Failure: ${f.kind}`, `${f.passed}/${f.assertions} assertions — ${f.outcome}`)),
    row("Tests", `${r.tests.passed}/${r.tests.total} in ${r.tests.files} files`),
    "",
  ].join("\n");
}

main();
