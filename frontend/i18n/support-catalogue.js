/**
 * The assistant's three catalogues, read off disk.
 *
 * ---------------------------------------------------------------------------
 * WHY A PARSER AND NOT AN IMPORT
 * ---------------------------------------------------------------------------
 * `guides.ts`, `workflows.ts` and `operations.ts` are backend TypeScript behind
 * the backend's own path aliases. Nothing in the frontend build — and nothing in
 * a gate script — has any business resolving `@b/db`, and two of the three files
 * import each other. So the shape is read as TEXT, exactly as
 * `tools/check-guide-anchors.mjs` already reads the same `guides.ts` for its
 * anchors. The files are machine-shaped and prettier-formatted, so a scanner is
 * honest here — and every consumer asserts a floor, because the way a check like
 * this rots is a parse that silently finds nothing and passes.
 *
 * ---------------------------------------------------------------------------
 * WHY ONE PARSER RATHER THAN THREE
 * ---------------------------------------------------------------------------
 * Three things need the same answer and they must not disagree:
 *
 *   `scripts/generate-i18n-manifest.js` needs the KEY LIST, so the catalogue's
 *   message ids reach the pre-generated locale chunks. They cannot be extracted
 *   from source the ordinary way: the lookups are computed — `t(\`guides.${key}
 *   .title\`)` — and `key-extractor.js` captures the raw template text, so it
 *   yields the literal nonsense key "guides.${key}.title" and the real ones are
 *   invisible to it.
 *
 *   `tools/check-support-assistant-keys.mjs` needs the same list, to assert that
 *   every entry has an English message.
 *
 *   Seeding `messages/en.json` needs the VALUES, which is why this returns the
 *   strings and not only the paths.
 *
 * A second copy of this scanner would drift in the quietest direction there is:
 * a gate that passes on keys the harvester never shipped.
 *
 * NOTE ON `what`: it is deliberately NOT harvested. `GuideDefinition.what` and
 * `WorkflowDefinition.what` are MODEL-FACING — they go into the tool
 * descriptions the model reads to choose a guide or a process. Translating them
 * would change what the model is shown, which is a different thing from what the
 * customer is shown.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const UTILS = path.join(ROOT, "backend", "src", "api", "(ext)", "ai", "support", "utils");

const GUIDES_FILE = path.join(UTILS, "guides.ts");
const WORKFLOWS_FILE = path.join(UTILS, "workflows.ts");
const OPERATIONS_FILE = path.join(UTILS, "operations.ts");

// ---------------------------------------------------------------------------
// A string literal, wherever it starts and however many lines it spans.
// ---------------------------------------------------------------------------

/**
 * Read the double-quoted literal at or after `index`, following `+` joins.
 *
 * Prettier wraps a long value onto the following line and splits longer ones
 * into `"a " + "b"`, so a line-oriented read would truncate half the catalogue.
 * Returns null when there is no literal there, which is how a caller tells a
 * field apart from a field it merely shares a prefix with.
 */
function readString(source, index) {
  let i = index;
  while (i < source.length && /\s/.test(source[i])) i++;
  if (source[i] !== '"') return null;

  let value = "";
  for (;;) {
    i++; // past the opening quote
    for (; i < source.length; i++) {
      const char = source[i];
      if (char === "\\") {
        const next = source[i + 1];
        value +=
          next === "n" ? "\n" : next === "t" ? "\t" : next === undefined ? "" : next;
        i++;
        continue;
      }
      if (char === '"') break;
      value += char;
    }
    i++; // past the closing quote

    // A `+` join continues the same value. Anything else ends it.
    let j = i;
    while (j < source.length && /\s/.test(source[j])) j++;
    if (source[j] !== "+") return { value, end: i };
    j++;
    while (j < source.length && /\s/.test(source[j])) j++;
    if (source[j] !== '"') return { value, end: i };
    i = j;
  }
}

/** The value of `<field>:` inside `block`, or null. Anchored on indentation. */
function field(block, name, indent) {
  const pattern = new RegExp(`^ {${indent}}${name}:`, "m");
  const match = pattern.exec(block);
  if (!match) return null;
  const read = readString(block, match.index + match[0].length);
  return read ? read.value : null;
}

// ---------------------------------------------------------------------------
// guides.ts
// ---------------------------------------------------------------------------

/**
 * `[{ key, title, stops: [{ title, body }] }]`, in catalogue order.
 *
 * A stop is identified by its POSITION, which is what the frontend has: the
 * overlay walks `active.stops` by index and there is no per-stop key to carry.
 * Every stop is counted, including the deliberate empty-anchor ones — they are
 * the opening and closing cards, and they carry the most-read sentence in the
 * whole walkthrough.
 */
function readGuides() {
  const source = fs.readFileSync(GUIDES_FILE, "utf8");
  const guides = [];
  let current = null;
  let stop = null;

  let offset = 0;
  for (const line of source.split("\n")) {
    const at = offset;
    offset += line.length + 1;

    const keyMatch = /^ {4}key: "([a-z0-9_]+)"/.exec(line);
    if (keyMatch) {
      current = { key: keyMatch[1], title: "", stops: [] };
      stop = null;
      guides.push(current);
      continue;
    }
    if (!current) continue;

    if (/^ {4}title:/.test(line)) {
      const read = readString(source, at + line.indexOf("title:") + "title:".length);
      if (read) current.title = read.value;
      continue;
    }
    if (/^ {8}anchor:/.test(line)) {
      stop = { title: "", body: "" };
      current.stops.push(stop);
      continue;
    }
    if (!stop) continue;
    if (/^ {8}title:/.test(line)) {
      const read = readString(source, at + line.indexOf("title:") + "title:".length);
      if (read) stop.title = read.value;
      continue;
    }
    if (/^ {8}body:/.test(line)) {
      const read = readString(source, at + line.indexOf("body:") + "body:".length);
      if (read) stop.body = read.value;
      continue;
    }
    // Optional — only the step-gated stops carry one.
    if (/^ {8}reveal:/.test(line)) {
      const read = readString(source, at + line.indexOf("reveal:") + "reveal:".length);
      if (read) stop.reveal = read.value;
    }
  }

  return guides;
}

// ---------------------------------------------------------------------------
// workflows.ts
// ---------------------------------------------------------------------------

/**
 * `[{ key, title, steps: [{ key, label, description, done }] }]`.
 *
 * Two step shapes, because the catalogue has two: an object literal, and the
 * `guideStep(key, guide, label, description, done)` helper that exists because
 * the boilerplate is identical on every guide-backed step. Both are read, and a
 * workflow that yields no steps throws rather than contributing nothing — a
 * silently step-less workflow is exactly the failure this parser must not have.
 */
function readWorkflows() {
  const source = fs.readFileSync(WORKFLOWS_FILE, "utf8");
  const blocks = [];
  const header = /^const \w+: WorkflowDefinition = \{$/gm;

  /*
   * Each block ends at its own closing `};`, not at the next declaration. The
   * `guideStep` HELPER is declared between two workflows, and a block that ran
   * to the next header swallowed its signature — where `guideStep(` appears with
   * parameter names rather than five strings behind it.
   */
  let match;
  while ((match = header.exec(source)) !== null) {
    const end = source.indexOf("\n};", match.index);
    blocks.push(source.slice(match.index, end === -1 ? source.length : end));
  }

  return blocks.map((block) => {
    const keyMatch = /^ {2}key: "([a-z0-9_]+)"/m.exec(block);
    if (!keyMatch) throw new Error("A WorkflowDefinition block has no key.");
    const key = keyMatch[1];
    const title = field(block, "title", 2) || "";
    const steps = [];

    // Object steps and `guideStep(...)` calls, in the order they appear.
    const marker = /^ {4}\{$|^ {4}guideStep\($/gm;
    let hit;
    while ((hit = marker.exec(block)) !== null) {
      if (hit[0].includes("guideStep")) {
        let index = hit.index + hit[0].length;
        const args = [];
        for (let i = 0; i < 5; i++) {
          const read = readString(block, index);
          if (!read) break;
          args.push(read.value);
          index = read.end;
          while (index < block.length && /[\s,]/.test(block[index])) index++;
        }
        if (args.length !== 5) {
          throw new Error(`guideStep in ${key} did not yield five strings.`);
        }
        steps.push({
          key: args[0],
          label: args[2],
          description: args[3],
          done: args[4],
        });
        continue;
      }

      const close = block.indexOf("\n    },", hit.index);
      const body = block.slice(hit.index, close === -1 ? block.length : close);
      const stepKey = /^ {6}key: "([a-z0-9_]+)"/m.exec(body);
      if (!stepKey) continue;
      steps.push({
        key: stepKey[1],
        label: field(body, "label", 6) || "",
        description: field(body, "description", 6) || "",
        // Only `navigate` and `guide` steps say what happens afterwards. An
        // operation step has no `done`, and inventing one would put a key in
        // en.json that nothing can ever render.
        done: field(body, "done", 6),
      });
    }

    if (!steps.length) throw new Error(`Workflow ${key} parsed with no steps.`);
    return { key, title, steps };
  });
}

// ---------------------------------------------------------------------------
// operations.ts
// ---------------------------------------------------------------------------

/** `[{ key, label, description }]` — the allowlist, in declaration order. */
function readOperations() {
  const source = fs.readFileSync(OPERATIONS_FILE, "utf8");
  const header = /^const \w+: OperationDefinition = \{$/gm;

  const starts = [];
  let match;
  while ((match = header.exec(source)) !== null) starts.push(match.index);

  return starts.map((start, i) => {
    const block = source.slice(start, starts[i + 1] ?? source.length);
    const keyMatch = /^ {2}key: "([a-z0-9_]+)"/m.exec(block);
    if (!keyMatch) throw new Error("An OperationDefinition block has no key.");
    return {
      key: keyMatch[1],
      label: field(block, "label", 2) || "",
      description: field(block, "description", 2) || "",
    };
  });
}

// ---------------------------------------------------------------------------

/** The whole catalogue, parsed once per process. */
let cache = null;
function readSupportCatalogue() {
  if (!cache) {
    cache = {
      guides: readGuides(),
      workflows: readWorkflows(),
      operations: readOperations(),
    };
  }
  return cache;
}

/** The namespace this all lands in. One constant, three consumers. */
const SUPPORT_ASSISTANT_NAMESPACE = "support_assistant";

/**
 * Every message id the catalogue needs, as dotted paths inside the namespace.
 *
 * Sorted, because this list is written into generated chunks and a wobbling
 * order is a diff on every build for no change.
 */
/**
 * The key list as the SHIPPED product can know it.
 *
 * `readSupportCatalogue` parses the backend TypeScript, and a customer install
 * does not have `backend/src` — it ships `backend/dist`. So on every install
 * this threw ENOENT, the caller swallowed it into an empty list, and the
 * assistant's guides, processes and actions were left out of the locale chunks
 * entirely: every language rendered the backend's English.
 *
 * Repointing at `backend/dist` does not work. `tsc` doubles the indentation and
 * strips the type annotations, and this parser keys on both (`^ {4}key:`,
 * `^const \w+: WorkflowDefinition`), so all four matchers return nothing
 * against compiled output.
 *
 * The committed English messages are the same key set by construction — they
 * are written FROM this function — so on an install they are the artefact, and
 * reading them needs no parser at all. In a repo the source is present and is
 * still the authority, which keeps the drift gate meaningful rather than
 * comparing `en.json` against itself.
 */
function assistantKeysFromMessages() {
  const messages = require("../messages/en.json");
  const root = messages?.[SUPPORT_ASSISTANT_NAMESPACE];
  if (!root || typeof root !== "object") return [];

  const keys = [];
  const walk = (node, trail) => {
    for (const [segment, value] of Object.entries(node)) {
      const next = trail ? `${trail}.${segment}` : segment;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value, next);
      } else {
        keys.push(next);
      }
    }
  };
  walk(root, "");

  return keys.sort();
}

function supportAssistantKeys() {
  // Absent SOURCE, not an unreadable one: a repo with a broken guides.ts must
  // still throw, or the gate would pass on a catalogue nobody can parse.
  if (!fs.existsSync(GUIDES_FILE)) {
    return assistantKeysFromMessages();
  }

  const { guides, workflows, operations } = readSupportCatalogue();
  const keys = new Set();

  for (const guide of guides) {
    keys.add(`guides.${guide.key}.title`);
    guide.stops.forEach((_, index) => {
      keys.add(`guides.${guide.key}.stops.${index}.title`);
      keys.add(`guides.${guide.key}.stops.${index}.body`);
      // Optional, so only declared where the catalogue actually has one — an
      // unconditional key would be 80 ids the gate demands and nothing renders.
      if (guide.stops[index].reveal) {
        keys.add(`guides.${guide.key}.stops.${index}.reveal`);
      }
    });
  }
  for (const workflow of workflows) {
    keys.add(`workflows.${workflow.key}.title`);
    for (const step of workflow.steps) {
      keys.add(`workflows.${workflow.key}.steps.${step.key}.label`);
      keys.add(`workflows.${workflow.key}.steps.${step.key}.description`);
      if (step.done) keys.add(`workflows.${workflow.key}.steps.${step.key}.done`);
    }
  }
  for (const operation of operations) {
    keys.add(`operations.${operation.key}.label`);
    keys.add(`operations.${operation.key}.description`);
  }

  return Array.from(keys).sort();
}

/**
 * The same thing with the ENGLISH constants in it — the shape `en.json` holds.
 *
 * The backend keeps those constants and they stay on the wire as the fallback,
 * so this is a copy rather than a move. That is deliberate: the fallback is what
 * makes an upgrade that adds a 22nd guide render English at a customer instead
 * of rendering `support_assistant.guides.x.title`.
 */
function supportAssistantMessages() {
  const { guides, workflows, operations } = readSupportCatalogue();

  const messages = { guides: {}, workflows: {}, operations: {} };

  for (const guide of guides) {
    const stops = {};
    guide.stops.forEach((stop, index) => {
      stops[String(index)] = {
        title: stop.title,
        body: stop.body,
        // Only when present, matching the key builder — an undefined value here
        // would make the drift check compare a string against nothing.
        ...(stop.reveal ? { reveal: stop.reveal } : {}),
      };
    });
    messages.guides[guide.key] = { title: guide.title, stops };
  }
  for (const workflow of workflows) {
    const steps = {};
    for (const step of workflow.steps) {
      steps[step.key] = {
        label: step.label,
        description: step.description,
        ...(step.done ? { done: step.done } : {}),
      };
    }
    messages.workflows[workflow.key] = { title: workflow.title, steps };
  }
  for (const operation of operations) {
    messages.operations[operation.key] = {
      label: operation.label,
      description: operation.description,
    };
  }

  return messages;
}

module.exports = {
  SUPPORT_ASSISTANT_NAMESPACE,
  readSupportCatalogue,
  supportAssistantKeys,
  supportAssistantMessages,
  GUIDES_FILE,
  WORKFLOWS_FILE,
  OPERATIONS_FILE,
};
