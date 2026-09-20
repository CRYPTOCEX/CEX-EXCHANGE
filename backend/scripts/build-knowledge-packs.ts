/**
 * Builds the shipped documentation packs that `ingestDocPacks()` reads.
 *
 *   pnpm --filter backend knowledge:build          # write backend/knowledge/*.ndjson.gz
 *   pnpm --filter backend knowledge:build --report # print what it would emit, write nothing
 *
 * One gzipped NDJSON file per product, one page per line. Shipping pre-extracted
 * pages rather than crawling a docs site means an air-gapped install works with
 * zero network access, which matters because a meaningful share of these installs
 * sit behind corporate proxies that will never reach mashdiv.com.
 *
 * ---------------------------------------------------------------------------
 * TWO EXCLUSIONS THAT ARE THE WHOLE POINT OF THIS FILE
 * ---------------------------------------------------------------------------
 *
 * RELEASE NOTES ARE NOT KNOWLEDGE. They are 3,166 of the 5,691 chunks the raw
 * corpus produces — 56% — and they are actively harmful in a support index, for
 * two separate reasons:
 *
 *   They out-rank the real answer. Measured on the live corpus: "I lost my 2FA
 *   device and can't log in" returned FIVE release notes in the top five, and
 *   nothing a customer could use. A changelog entry repeats a feature's name in
 *   a short, dense chunk, which is exactly the shape BM25 rewards.
 *
 *   They are version-specific and mostly false. "Rejected withdrawals left the
 *   balance untouched" describes a bug that existed in 6.5.7 and was fixed in
 *   6.5.8. Retrieved into an answer it becomes a confident statement about how
 *   the operator's platform behaves today, sourced from a document describing
 *   how it behaved two releases ago.
 *
 * AUDIENCE IS CARRIED, NOT INFERRED. `section` in the frontmatter already says
 * who a page is for, and the split is clean: Guides/Troubleshooting/Overview are
 * written for the end customer, Admin/Reference/Install/Operate/Configure are
 * written for the operator. A customer asking "when do I get my staking
 * rewards?" was being answered from `staking/reference/api` — the admin endpoint
 * listing — while `staking/guides/rewards`, which contains the actual formula,
 * sat below it. The weight is applied at retrieval time rather than by dropping
 * operator pages, because the SAME index serves the admin-side "ask about this
 * user" surface, where the reference pages are the right answer.
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

/** Repo root, resolved from this file so the script runs from anywhere. */
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DOCS_ROOT = path.join(REPO_ROOT, "store", "content", "docs");
const OUT_DIR = path.join(REPO_ROOT, "backend", "knowledge");

export type Audience = "CUSTOMER" | "OPERATOR";

export interface DocPage {
  /** `p2p/guides/trades` — the docs-site path, and the citation URL suffix. */
  slug: string;
  product: string;
  title: string;
  description?: string;
  section?: string;
  audience: Audience;
  trail: string[];
  tags: string[];
  body: string;
}

/**
 * Sections whose pages are written for the operator, not the end customer.
 *
 * Matched case-insensitively against the frontmatter value. Anything not listed
 * — including a page with no `section` at all — is treated as CUSTOMER, which is
 * the safe default: mis-labelling a customer page as operator-only would bury a
 * real answer, while the reverse merely fails to promote one.
 */
const OPERATOR_SECTIONS = new Set([
  "admin",
  "reference",
  "install",
  "operate",
  "configure",
]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

/**
 * Minimal YAML frontmatter reader — scalars and inline `[a, b]` lists only.
 *
 * Deliberately not a YAML dependency: this runs in the release pipeline and the
 * frontmatter in this corpus is a flat key/value block. Two real shapes in the
 * live corpus that a naive `split(":")` gets wrong, and both are handled here:
 * a trailing `# comment` after a value (`section: Install   # optional`), and a
 * key with an empty value (`section:`).
 */
export function parseFrontmatter(source: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { meta: {}, body: source };

  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    // Strip a trailing comment, but only when it is clearly one — a `#` inside
    // a quoted string or an anchor like `#section` must survive.
    if (!/^["'[]/.test(value)) value = value.replace(/\s+#.*$/, "").trim();
    value = value.replace(/^["'](.*)["']$/, "$1");
    meta[kv[1]] = value;
  }
  return { meta, body: source.slice(match[0].length) };
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return [];
  const inner = /^\[(.*)\]$/.exec(raw.trim());
  const list = inner ? inner[1] : raw;
  return list
    .split(",")
    .map((t) => t.trim().replace(/^["'](.*)["']$/, "$1"))
    .filter(Boolean);
}

/**
 * Audience for a page, DECLARED where possible and inferred only as a fallback.
 *
 * The inference is what mislabelled the existing `guides/` tree: `section:
 * Guides` scores CUSTOMER, and `staking/guides/pools.md` — whose second
 * paragraph is "Create one at Extensions → Staking Services → Pools → New Pool
 * (`/admin/staking/pool/new`). You need `create.staking.pool`." — was therefore
 * offered to customers as a customer-facing answer.
 *
 * `audience:` in the frontmatter settles it and cannot be broken by a future
 * section rename. The `help/` corpus (see `plans/AI-SUPPORT-KNOWLEDGE.md`)
 * declares it on every page and the gate enforces that.
 */
export function audienceOf(
  section: string | undefined,
  declared?: string,
  slug?: string
): Audience {
  const explicit = (declared || "").trim().toUpperCase();
  if (explicit === "CUSTOMER" || explicit === "OPERATOR") return explicit;

  /*
   * ---------------------------------------------------------------------------
   * THE DEFAULT WAS CUSTOMER, AND IT PUT THE VENDOR'S NAME IN THE INDEX
   * ---------------------------------------------------------------------------
   * A product's `index.md`, its `guides/` and its `troubleshooting` page carry no
   * `section` and no `audience`, so they fell through to CUSTOMER. They are
   * written for a BUYER — "lets your users build automated strategies against
   * your platform's own order book" — and they say `Bicrypto` throughout, because
   * to a buyer that is simply the name of the thing they bought.
   *
   * Measured: 54 such pages, producing 80 CUSTOMER chunks whose TEXT names the
   * vendor. The model is instructed to answer from the documents it is given, so
   * that is 80 passages telling a white-labelled operator's customers what
   * software they are on and who sells it.
   *
   * The old default's rationale was about RANKING — "mis-labelling a customer
   * page as operator-only would bury a real answer, while the reverse merely
   * fails to promote one." That was true when the only cost was ordering. It is
   * not true once the corpus is fed to a model, where the reverse is a
   * disclosure.
   *
   * So the default inverts, and the rule is the one the corpus is actually
   * written to: `<product>/help/` IS the customer documentation. It was built
   * deliberately, every page in it declares `audience:` (the guide gate enforces
   * that), and nothing else in a product's tree was ever written with a customer
   * in mind.
   *
   * No customer answer is buried by this: every `help/` page states its audience
   * explicitly, so the explicit branch above settles all 123 of them before this
   * line is reached.
   */
  const key = (section || "").trim().toLowerCase();
  if (OPERATOR_SECTIONS.has(key)) return "OPERATOR";

  const path = (slug || "").toLowerCase();
  return path.includes("/help/") ? "CUSTOMER" : "OPERATOR";
}

/** True for paths this index must never contain. See the header. */
export function isExcluded(slug: string): boolean {
  return /(^|\/)releases\//.test(slug) || /(^|\/)AUTHORING$/i.test(slug);
}

/**
 * Reads every documentation page, minus the exclusions.
 *
 * Exported because the retrieval eval builds its corpus through THIS function
 * rather than re-implementing the walk. A second reader of the same input is how
 * an eval ends up scoring a corpus the product never actually indexes — the same
 * argument `tools/lib/permission-source.js` makes for having one parser.
 */
export function collectDocPages(docsRoot: string = DOCS_ROOT): DocPage[] {
  const pages: DocPage[] = [];

  for (const file of walk(docsRoot)) {
    const slug = path
      .relative(docsRoot, file)
      .replace(/\\/g, "/")
      .replace(/\.md$/, "");

    if (isExcluded(slug)) continue;

    let source: string;
    try {
      source = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const { meta, body } = parseFrontmatter(source);
    if (!body.trim()) continue;

    const product = slug.split("/")[0];
    const section = meta.section || undefined;
    const title = meta.title || meta.nav || product;

    /*
     * ---------------------------------------------------------------------
     * THE PACK SLUG IS OUR FILING SYSTEM, NOT A BREADCRUMB
     * ---------------------------------------------------------------------
     * `product` is the directory name: `bicrypto`, `p2p`,
     * `mailwizard-bicrypto`. It went into the trail as element 0, `chunker.ts`
     * joined it into the breadcrumb, and `prompt.ts` sent that as the document
     * title — so a CUSTOMER-audience citation rendered
     *
     *   BICRYPTO · OVERVIEW
     *   Bicrypto
     *
     * on a white-labelled platform whose customers have never heard the name.
     * Measured against the real corpus: 222 customer-audience chunks.
     *
     * It cannot be fixed on the client. The slice that builds the crumb could
     * drop element 0, but the leak is in the TITLE as well, and the page's own
     * `meta.title` is what the model reads.
     *
     * So the root is stripped HERE, at the only place that knows the slug is a
     * directory rather than a name. `section` and the page title carry all the
     * navigational meaning a reader needs; the product is what the operator
     * already knows they are on.
     *
     * OPERATOR-audience pages keep it: an operator reading their own console
     * documentation is entitled to know which product a page belongs to, and
     * that is the audience the trail's product element was written for.
     */
    const audience = audienceOf(section, meta.audience, slug);
    const trailRoot = audience === "CUSTOMER" ? [] : [product];

    pages.push({
      slug,
      product,
      title,
      description: meta.description,
      section,
      audience,
      // The breadcrumb root. `chunkMarkdown` appends the page's own heading
      // trail beneath it, producing "P2P › Guides › The trade lifecycle ›
      // The fee" — which is indexed at ×2.5 and is the strongest single signal
      // in the index.
      trail: [...trailRoot, section, title].filter(Boolean) as string[],
      tags: parseTags(meta.tags),
      body,
    });
  }

  pages.sort((a, b) => a.slug.localeCompare(b.slug));
  return pages;
}

/** Groups pages into one pack per product. */
export function groupByProduct(pages: DocPage[]): Map<string, DocPage[]> {
  const byProduct = new Map<string, DocPage[]>();
  for (const page of pages) {
    let list = byProduct.get(page.product);
    if (!list) {
      list = [];
      byProduct.set(page.product, list);
    }
    list.push(page);
  }
  return byProduct;
}

/** One NDJSON line per page, in the shape `ingestDocPacks()` parses. */
export function serialisePack(pages: DocPage[]): string {
  return (
    pages
      .map((page) =>
        JSON.stringify({
          slug: page.slug,
          title: page.title,
          section: page.section,
          audience: page.audience,
          trail: page.trail,
          tags: page.tags,
          body: page.body,
        })
      )
      .join("\n") + "\n"
  );
}

function main(): void {
  const reportOnly = process.argv.includes("--report");

  if (!fs.existsSync(DOCS_ROOT)) {
    console.error(`No docs at ${DOCS_ROOT}. Nothing to build.`);
    process.exit(1);
  }

  const pages = collectDocPages();
  const byProduct = groupByProduct(pages);

  let customer = 0;
  for (const page of pages) if (page.audience === "CUSTOMER") customer++;

  console.log(
    `${pages.length} pages across ${byProduct.size} products ` +
      `(${customer} customer-facing, ${pages.length - customer} operator-facing)`
  );

  if (reportOnly) {
    for (const [product, list] of [...byProduct].sort()) {
      console.log(`  ${product.padEnd(30)} ${String(list.length).padStart(3)} pages`);
    }
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Packs are keyed by product slug and matched against the `extension` table,
  // so a stale file for a product that no longer exists would keep being
  // ingested. The directory is cleared rather than merged into.
  for (const stale of fs.readdirSync(OUT_DIR)) {
    if (stale.endsWith(".ndjson.gz")) fs.unlinkSync(path.join(OUT_DIR, stale));
  }

  let bytes = 0;
  for (const [product, list] of byProduct) {
    // An unchanged corpus must produce a byte-identical file: `ingestDocPacks`
    // skips a pack whose sha256 matches the stored checksum, and re-chunking
    // 500 pages on every boot is minutes of CPU for no change. A timestamp in
    // the gzip header would defeat that on every build — Node writes MTIME as
    // four zero bytes and exposes no option to change it, which is what makes
    // this reproducible. `emits byte-identical packs` in the eval pins it.
    const gz = zlib.gzipSync(Buffer.from(serialisePack(list), "utf8"), {
      level: 9,
    });
    fs.writeFileSync(path.join(OUT_DIR, `${product}.ndjson.gz`), gz);
    bytes += gz.length;
  }

  console.log(
    `Wrote ${byProduct.size} packs to ${path.relative(REPO_ROOT, OUT_DIR)} ` +
      `(${(bytes / 1024).toFixed(0)} KB total)`
  );
}

if (require.main === module) main();
