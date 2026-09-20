"use strict";

/**
 * Backfills `lastMessageAt` and `lastMessageFrom` on every existing ticket.
 *
 * The support desk queue is ordered by who is waiting and for how long. Both
 * are facts about the last message a PERSON sent, and until now both were
 * computed in JavaScript from the `messages` blob — which meant the queue could
 * only be ordered AFTER the rows had been fetched, so its `LIMIT` had to pick
 * rows by some other key and threw away exactly the longest-waiting ones the
 * queue exists to surface.
 *
 * `appendSupportMessage` and `replaceSupportMessage` now maintain the two
 * columns on every write, but that only governs messages sent from now on. Rows
 * already in the table would sort with NULLs — i.e. by `createdAt` — until
 * somebody happened to reply to them. Every ticket carries its own evidence, so
 * the values are recoverable:
 *
 *    last non-system message from the customer -> from = 'client'
 *    last non-system message from an agent     -> from = 'agent'
 *    nothing but system chips, or no messages  -> both NULL, queue uses createdAt
 *
 * SYSTEM CHIPS ARE SKIPPED, exactly as `lastMessageFields` skips them. A status
 * change or a handover notice is the interface speaking; counting one as the
 * last word would show a ticket as answered when the customer is still waiting.
 *
 * Idempotent — it derives the same answer from the same messages every run.
 * `updatedAt = updatedAt` on every UPDATE keeps the backfill from looking like
 * desk activity: this is bookkeeping, and a queue sorted by recency must not
 * report that every ticket was touched the day the operator upgraded.
 */

const SELECT = (queryInterface) => ({
  type: queryInterface.sequelize.QueryTypes.SELECT,
});

function toSqlDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Formats for the wire in UTC, keeping milliseconds.
 *
 * ---------------------------------------------------------------------------
 * BOTH WRITERS MUST AGREE ON WHAT A `DATETIME` MEANS
 * ---------------------------------------------------------------------------
 * `DATETIME` is timezone-naive: it stores a wall clock and nothing else, so the
 * convention is whatever the writer decides. Sequelize's mysql dialect defaults
 * to `timezone: "+00:00"` and `backend/src/db.ts` does not override it, so every
 * date the ORM has ever written — `createdAt`, `updatedAt`, and `lastMessageAt`
 * from `appendSupportMessage` — is the UTC wall clock.
 *
 * This seeder writes through a raw query, where nothing converts anything, so
 * it has to state that convention itself. Formatting with LOCAL getters was
 * measurably wrong: a ticket whose last message is `02:06:09.368Z` landed as
 * `05:06:09.368` while the same ticket answered a minute later through the app
 * landed as the UTC value. Backfilled rows and newly-answered rows then sit
 * hours apart on the one column the queue is ORDERED BY, which is a defect no
 * single-row check can see — it only appears when the two populations are
 * sorted against each other.
 *
 * Milliseconds are written by hand because handing a raw `query()` a `Date`
 * gets it escaped to second precision, and two messages 15ms apart would tie on
 * a column declared `DATETIME(3)` precisely so they do not.
 */
function toSqlString(date) {
  if (!date) return null;
  const pad = (n, width = 2) => String(n).padStart(width, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}` +
    `.${pad(date.getUTCMilliseconds(), 3)}`
  );
}

module.exports = {
  async up(queryInterface) {
    const tickets = await queryInterface.sequelize.query(
      "SELECT id, messages, lastMessageAt, lastMessageFrom FROM support_ticket",
      SELECT(queryInterface)
    );

    let written = 0;
    let empty = 0;

    for (const ticket of tickets) {
      /*
       * How the driver hands `messages` back proves nothing about the stored
       * shape: MySQL parses a JSON column into a value, MariaDB stores JSON as
       * LONGTEXT and returns raw text. The double-encode is only visible when
       * parsing once yields another string that itself parses to an array.
       */
      let messages = ticket.messages;
      if (typeof messages === "string") {
        try {
          messages = JSON.parse(messages);
        } catch {
          // Unreadable messages are not evidence of anything; leave the row be.
          continue;
        }
      }
      if (typeof messages === "string") {
        try {
          messages = JSON.parse(messages);
        } catch {
          continue;
        }
      }
      if (!Array.isArray(messages)) continue;

      let at = null;
      let from = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (!message || message.system) continue;
        at = message.time ? toSqlDate(message.time) : null;
        from = String(message.type ?? "").toLowerCase() === "client"
          ? "client"
          : "agent";
        break;
      }

      if (!from) {
        empty++;
        continue;
      }

      /*
       * Already correct — skip the write so a re-run costs nothing. Compared as
       * epoch milliseconds, not as objects or strings: two `Date`s are never
       * `===`, and the column is second-resolution while a message `time`
       * carries milliseconds, so anything stricter than a one-second tolerance
       * rewrites every row on every run.
       */
      const currentMs = ticket.lastMessageAt
        ? new Date(ticket.lastMessageAt).getTime()
        : null;
      const nextMs = at ? at.getTime() : null;
      const sameAt =
        currentMs === null && nextMs === null
          ? true
          : currentMs !== null &&
            nextMs !== null &&
            Math.abs(currentMs - nextMs) < 1000;
      if (sameAt && ticket.lastMessageFrom === from) continue;

      await queryInterface.sequelize.query(
        `UPDATE support_ticket
            SET lastMessageAt = :at, lastMessageFrom = :from, updatedAt = updatedAt
          WHERE id = :id`,
        { replacements: { at: toSqlString(at), from, id: ticket.id } }
      );
      written++;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[support-ticket-last-message] backfilled ${written} ticket(s); ` +
        `${empty} had no conversational message and keep NULL (the queue falls back to createdAt)`
    );
  },

  async down(queryInterface) {
    // Safe to reverse: both columns are pure derivations of `messages`, so
    // clearing them loses nothing that `up` cannot recompute.
    await queryInterface.sequelize.query(
      "UPDATE support_ticket SET lastMessageAt = NULL, lastMessageFrom = NULL, updatedAt = updatedAt"
    );
  },
};
