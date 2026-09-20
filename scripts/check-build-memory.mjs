#!/usr/bin/env node
/**
 * Say so BEFORE the kernel kills the build.
 * ============================================================================
 *
 * A Turbopack production build of this frontend peaks at roughly 4.8 GB
 * resident. On a VPS that cannot spare that, the Linux OOM killer takes the
 * process, and what the operator sees is this:
 *
 *     Creating an optimized production build ...
 *      ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL  frontend@ build: ...
 *     Exit status 1
 *
 * No error. No file. No stack. Next.js never got to report anything, because
 * it was not Next.js that failed — the process was killed, and pnpm flattens a
 * signal death into "Exit status 1". The only record is `dmesg`, which nobody
 * reads when a build fails, because a build that fails normally TELLS you why.
 * That silence is the entire cost of this failure: it looks like a code bug in
 * the release, and it is diagnosed as one, repeatedly.
 *
 * So this measures the headroom first and names the problem in advance.
 *
 * WHY IT ONLY WARNS.
 * The number is a threshold, not a prediction — peak usage moves with how many
 * extensions the licence includes, and a box slightly under the line may well
 * finish. Refusing to start would turn a survivable build into a hard failure,
 * which is a worse trade than a warning that is occasionally unnecessary.
 *
 * WHY `--max-old-space-size` IS NOT THE ANSWER, AND IS NOT MEASURED HERE.
 * The build script passes 8192, and it is tempting to read the kill as V8
 * hitting that ceiling. It is not. Turbopack does its work in native Rust, and
 * `--max-old-space-size` bounds only the JS heap: capping it at 3072 was tried
 * on a box that OOMed, and peak RSS was unchanged. The lever is how much memory
 * the MACHINE has, which is what this looks at.
 */

import fs from "fs";
import os from "os";

/* Measured peak RSS of `next build` on a full install, rounded up. */
const NEEDED_MB = 5 * 1024;

/**
 * Memory a build could actually obtain, in MB.
 *
 * `MemAvailable` rather than `free`: the kernel's own estimate of what is
 * reclaimable, which is the only figure that means anything here — a box with
 * 4 GB of page cache has no "free" memory and builds fine. Swap counts, because
 * a build that pages is slow but ALIVE, and slow is not the failure being
 * guarded against.
 */
function headroom() {
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf8");
    const field = (name) => {
      const match = meminfo.match(new RegExp(`^${name}:\\s+(\\d+) kB`, "m"));
      return match ? Number(match[1]) / 1024 : null;
    };
    const available = field("MemAvailable");
    if (available === null) return null;
    return { available, swap: field("SwapFree") ?? 0, source: "/proc/meminfo" };
  } catch {
    /* Not Linux, or a container without /proc. `freemem()` is a poorer estimate
       (it excludes reclaimable cache) but it is never wrong in the optimistic
       direction, so a warning it produces is still worth printing. */
    return { available: os.freemem() / (1024 * 1024), swap: 0, source: "os.freemem()" };
  }
}

const mem = headroom();
if (mem) {
  const total = Math.round(mem.available + mem.swap);
  if (total < NEEDED_MB) {
    const mb = (n) => `${Math.round(n)} MB`;
    process.stdout.write(
      [
        "",
        "  ⚠  Not enough memory for a production build.",
        "",
        `     available RAM   ${mb(mem.available)}`,
        `     free swap       ${mb(mem.swap)}`,
        `     usable total    ${mb(total)}  (from ${mem.source})`,
        `     this build needs about ${mb(NEEDED_MB)}`,
        "",
        "     If it is short, the kernel kills the build and NOTHING is printed —",
        "     no error, no file, just a non-zero exit. If that is what you are",
        "     looking at, `dmesg -T | grep -i oom` will show the kill.",
        "",
        "     Either free memory (stop antivirus/mail scanners and other services",
        "     for the duration) or add swap, which is the reliable fix:",
        "",
        "       sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile",
        "       sudo mkswap /swapfile && sudo swapon /swapfile",
        "       echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab",
        "",
        "     Building anyway.",
        "",
      ].join("\n")
    );
  }
}
