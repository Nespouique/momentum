import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const git = (...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const prd = await read("docs/prd.md");
const sprint = await read("docs/stories/sprint-status.yaml");
const statuses = new Map();
const epicStatuses = new Map();
// Only development_status entries are live statuses, not workflow metadata.
const developmentStatus = sprint.split(/^development_status:\s*$/m)[1] ?? "";
for (const match of developmentStatus.matchAll(/^\s{2}(\d+)-(\d+)-[^:]+:\s*([\w-]+)/gm)) {
  statuses.set(`${match[1]}.${match[2]}`, match[3]);
}
for (const match of developmentStatus.matchAll(/^\s{2}epic-(\d+):\s*([\w-]+)/gm)) {
  epicStatuses.set(Number(match[1]), match[2]);
}

function normalizeStatus(raw) {
  const value = raw.toLowerCase().trim();
  if (/^(done|completed)\b/.test(value)) return "done";
  if (/^(ready for review|review)\b/.test(value)) return "review";
  if (/^(in.progress|in progress)\b/.test(value)) return "active";
  if (/^(ready.for.dev|approved|ready)\b/.test(value)) return "ready";
  if (/^(draft|backlog|to do)\b/.test(value)) return "backlog";
  if (/^(deferred|on hold)\b/.test(value)) return "deferred";
  return "unknown";
}

function section(content, heading) {
  const match = content.match(
    new RegExp(`^## ${heading}[^\\n]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, "m")
  );
  return match?.[1]?.trim() ?? "";
}

const stories = [];
const files = await readdir(new URL("docs/stories/", root));
for (const file of files.filter((name) => /^\d+\.\d+\..+\.md$/.test(name))) {
  const content = await read(`docs/stories/${file}`);
  const header = content.match(/^# Story (\d+)\.(\d+):\s*(.+)$/m);
  if (!header) throw new Error(`Missing canonical story heading: ${file}`);
  const id = `${header[1]}.${header[2]}`;
  if (stories.some((story) => story.id === id)) throw new Error(`Duplicate story: ${id}`);
  const rawStatus = content.match(/^## Status:\s*(.+)$/m)?.[1] ?? "Unknown";
  const statusSection = section(content, "Status$");
  const deferred = /\bDEFERRED\b/i.test(statusSection);
  const sprintStatus = statuses.get(id);
  const status = sprintStatus
    ? normalizeStatus(sprintStatus)
    : deferred
      ? "deferred"
      : normalizeStatus(rawStatus);
  const taskSection =
    section(content, "Tasks(?: / Subtasks)?") || section(content, "Definition of Done");
  // Ignore example checklists inside fenced code blocks.
  const taskText = taskSection.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  const tasks = [...taskText.matchAll(/^(\s*)- \[([ xX])\]\s+(.+)$/gm)].map((match) => ({
    done: match[2].toLowerCase() === "x",
    text: match[3],
    nested: match[1].replace(/\n/g, "").length > 0,
  }));
  const artifacts = files.filter((name) => name.startsWith(`${id}-`) && name.endsWith(".md"));
  stories.push({
    id,
    epic: Number(header[1]),
    title: header[3],
    status,
    rawStatus,
    sprintStatus: sprintStatus ?? null,
    statusSource: sprintStatus ? "stories/sprint-status.yaml" : `stories/${file}`,
    conflict: Boolean(sprintStatus && normalizeStatus(rawStatus) !== status),
    optional: /\boption(?:nel|al)\b/i.test(header[3]) || /\boptional\b/i.test(statusSection),
    path: `stories/${file}`,
    summary: section(content, "(?:User )?Story"),
    tasks,
    artifacts: artifacts.map((name) => `stories/${name}`),
    content,
  });
}
stories.sort((a, b) => a.epic - b.epic || Number(a.id.split(".")[1]) - Number(b.id.split(".")[1]));

const epicList = section(prd, "Epic List");
const epics = [...epicList.matchAll(/^### Epic (\d+):\s*(.+)\n\*\*Goal:\*\*\s*(.+)$/gm)].map(
  (match) => ({
    id: Number(match[1]),
    title: match[2].replace(/\s*✅/g, ""),
    goal: match[3],
    source: "prd.md",
  })
);
// Epic 5's canonical stories describe the Momentum side of the companion integration.
if (stories.some((story) => story.epic === 5) && !epics.some((epic) => epic.id === 5)) {
  epics.push({
    id: 5,
    title: "Health Sync · Companion Android",
    goal: "Schéma de données, synchronisation Health Connect et consultation des activités côté API Momentum.",
    source: "specs/momentum-companion-prd.md",
  });
}
for (const story of stories) {
  if (!epics.some((epic) => epic.id === story.epic)) {
    epics.push({
      id: story.epic,
      title: `Epic ${story.epic}`,
      goal: "Epic découvert dans les stories.",
      source: story.path,
    });
  }
}
for (const epic of epics) epic.explicitStatus = epicStatuses.get(epic.id) ?? null;
epics.sort((a, b) => a.id - b.id);

const missingStories = [...prd.matchAll(/^### Story (\d+\.\d+):/gm)]
  .map((match) => match[1])
  .filter((id) => !stories.some((story) => story.id === id));
const repository = git("remote", "get-url", "origin")
  .trim()
  .replace(/^git@github\.com:/, "https://github.com/")
  .replace(/\.git$/, "");
const commits = git(
  "log",
  "HEAD",
  "--reverse",
  "--format=%x1e%H%x1f%cI%x1f%s%x1f%b%x1f",
  "--name-only"
)
  .split("\x1e")
  .filter(Boolean)
  .map((record) => {
    const [sha, date, subject, body, paths] = record.split("\x1f");
    return { sha, date, subject, body, paths: paths.trim().split("\n").filter(Boolean) };
  });
const events = [];
const previousStatuses = new Map();
const addEvent = (commit, kind, ids, extra = {}) =>
  events.push({
    sha: commit.sha,
    date: commit.date,
    subject: commit.subject,
    kind,
    storyIds: [...new Set(ids)],
    url: `${repository}/commit/${commit.sha}`,
    ...extra,
  });
for (const commit of commits) {
  const message = `${commit.subject}\n${commit.body}`;
  const referenced = new Set();
  for (const fragment of message.matchAll(/stor(?:y|ies)[\s-]+([^\n)]+)/gi)) {
    for (const range of fragment[1].matchAll(/(\d+)\.(\d+)\s*[-–]\s*(?:\1\.)?(\d+)/g)) {
      for (let index = Number(range[2]); index <= Number(range[3]); index++)
        referenced.add(`${range[1]}.${index}`);
    }
    for (const id of fragment[1].matchAll(/\b\d+\.\d+\b/g)) referenced.add(id[0]);
  }
  const changedStories = [];
  for (const path of commit.paths.filter((path) =>
    /^docs\/stories\/\d+\.\d+\..+\.md$/.test(path)
  )) {
    const id = path.match(/\/(\d+\.\d+)\./)[1];
    if (!stories.some((story) => story.id === id)) continue;
    const content = git("show", `${commit.sha}:${path}`);
    const raw = content.match(/^## Status:\s*(.+)$/m)?.[1];
    if (!raw) continue;
    const status = /\bDEFERRED\b/i.test(section(content, "Status$"))
      ? "deferred"
      : normalizeStatus(raw);
    if (previousStatuses.get(id) !== status) {
      addEvent(commit, "status", [id], {
        status,
        previousStatus: previousStatuses.get(id) ?? null,
        source: path,
      });
      if (!previousStatuses.has(id) && status === "done") changedStories.push(id);
      previousStatuses.set(id, status);
    }
  }
  // This implementation commit precedes the canonical story's documentation commit.
  if (commit.sha.startsWith("226f0de")) referenced.add("3.8");
  const ids = [...referenced].filter((id) => stories.some((story) => story.id === id));
  const codeChanged = commit.paths.some((path) =>
    /^(apps\/|packages\/|scripts\/|docker\/|\.github\/workflows\/)/.test(path)
  );
  if (/^feat(?:\(|:)/i.test(commit.subject)) {
    addEvent(commit, "implementation", ids, { evidence: ids.length ? "message" : "feature" });
  } else if (/^release:/i.test(commit.subject)) {
    if (codeChanged && changedStories.length)
      addEvent(commit, "implementation", changedStories, { evidence: "completed-story-and-code" });
    addEvent(commit, "release", [], { version: commit.subject.replace(/^release:\s*/i, "") });
  } else if (/^fix(?:\(|:)/i.test(commit.subject)) {
    addEvent(commit, "fix", ids);
  }
}
for (const story of stories) {
  const implementation = events.filter(
    (event) => event.kind === "implementation" && event.storyIds.includes(story.id)
  );
  story.firstImplementation = implementation[0]?.date ?? null;
  story.lastImplementation = implementation.at(-1)?.date ?? null;
  story.completedAt =
    events.find(
      (event) =>
        event.kind === "status" && event.status === "done" && event.storyIds.includes(story.id)
    )?.date ?? null;
}
const history = {
  head: git("rev-parse", "HEAD").trim(),
  shallow: git("rev-parse", "--is-shallow-repository").trim() === "true",
  commitCount: commits.length,
  firstDate: commits[0]?.date,
  lastDate: commits.at(-1)?.date,
  events,
};
const data = {
  generatedAt: new Date().toISOString(),
  version: JSON.parse(await read("package.json")).version,
  epics,
  stories,
  missingStories,
  history,
};
const template = await read("scripts/project-progress.template.html");
const serialized = JSON.stringify(data)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");
if (!template.includes("__PROJECT_DATA__")) throw new Error("Missing template data placeholder");
const output = new URL("docs/progress.html", root);
await writeFile(
  output,
  template.replace("__PROJECT_DATA__", () => serialized)
);
const counts = Object.fromEntries(
  [...new Set(stories.map((story) => story.status))].map((status) => [
    status,
    stories.filter((story) => story.status === status).length,
  ])
);
console.log(
  `Generated ${fileURLToPath(output)}: ${epics.length} epics, ${stories.length} stories`,
  counts
);
if (missingStories.length)
  console.warn("PRD stories without a canonical file:", missingStories.join(", "));
