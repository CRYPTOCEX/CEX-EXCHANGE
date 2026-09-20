"use strict";

/**
 * Repairs support tickets whose status says the opposite of what happened.
 *
 * `REPLIED` was written by two different routes for two opposite events: the
 * admin reply route wrote it when an AGENT answered ("waiting on the customer"),
 * and the user reply route wrote it when the CUSTOMER answered ("waiting on
 * us"). One value, two meanings, so nothing downstream could triage on it — and
 * the admin queue, which lists the waiting-on-us statuses, silently dropped
 * every ticket a customer had followed up on.
 *
 * The code fix (user reply now writes OPEN) only governs messages sent from now
 * on. The rows already in the table still carry the old value, so without this
 * the queue opens correct-but-empty on an install that has a backlog. Every
 * ticket carries its own evidence — `messages` is an ordered array and each
 * entry declares `type: "client" | "agent"` — so the true status is recoverable:
 *
 *    last message from the customer  -> OPEN     (waiting on us)
 *    last message from an agent      -> REPLIED  (waiting on the customer)
 *    no messages at all              -> PENDING  (nothing said yet)
 *
 * CLOSED is never touched: it is a decision someone made, not a derivation, and
 * re-opening resolved tickets would be the worse error by far.
 *
 * Idempotent — it computes the same answer from the same messages every time,
 * and `down` is a no-op because the previous values were ambiguous by
 * construction: there is nothing coherent to restore them to.
 */

const SELECT = (queryInterface) => ({
  type: queryInterface.sequelize.QueryTypes.SELECT,
});

module.exports = {
  async up(queryInterface) {
    // `JSON_EXTRACT(... '$[last].type')` would do this in SQL, but `messages`
    // has been written as both a JSON array and a JSON-encoded STRING over this
    // table's life, and only one of those is addressable that way. Reading the
    // column and normalising in JS handles both shapes.
    const tickets = await queryInterface.sequelize.query(
      "SELECT id, status, messages FROM support_ticket WHERE status <> 'CLOSED'",
      SELECT(queryInterface)
    );

    const updates = { OPEN: [], REPLIED: [], PENDING: [] };
    // Rows whose `messages` holds a JSON *string* encoding an array rather than
    // the array itself — a double-encode from an older write path. It matters
    // beyond tidiness: `JSON_LENGTH` of a scalar string is 1, so `"[]"` measures
    // as "one message" to any SQL that asks the obvious question, and an empty
    // chat session reads as a real one.
    const doubleEncoded = [];

    for (const ticket of tickets) {
      // How the driver hands this back depends on the server: MySQL parses a
      // JSON column into a value, MariaDB stores JSON as LONGTEXT and returns
      // the raw text. So arriving as a string proves NOTHING about the stored
      // shape — the double-encode is only visible when parsing once yields
      // another string that itself parses to an array.
      let messages = ticket.messages;
      let wasDoubleEncoded = false;

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
          const inner = JSON.parse(messages);
          if (Array.isArray(inner)) {
            messages = inner;
            wasDoubleEncoded = true;
          }
        } catch {
          continue;
        }
      }
      if (!Array.isArray(messages)) continue;

      if (wasDoubleEncoded) {
        doubleEncoded.push({ id: ticket.id, messages: JSON.stringify(messages) });
      }

      let expected;
      if (messages.length === 0) {
        expected = "PENDING";
      } else {
        const last = messages[messages.length - 1];
        const fromAgent = String(last?.type ?? "").toLowerCase() === "agent";
        expected = fromAgent ? "REPLIED" : "OPEN";
      }

      if (expected !== ticket.status) updates[expected].push(ticket.id);
    }

    // Normalise the shape while we are here, so every later reader — SQL
    // included — sees one representation. A plain parameter, NOT
    // `CAST(:m AS JSON)`: this product runs on MariaDB as well as MySQL, and
    // MariaDB has no JSON type to cast to — the cast is a syntax error there.
    for (const row of doubleEncoded) {
      await queryInterface.sequelize.query(
        "UPDATE support_ticket SET messages = :m, updatedAt = updatedAt WHERE id = :id",
        { replacements: { m: row.messages, id: row.id } }
      );
    }
    if (doubleEncoded.length) {
      // eslint-disable-next-line no-console
      console.log(
        `[support-ticket-status-repair] normalised ${doubleEncoded.length} double-encoded messages column(s)`
      );
    }

    for (const [status, ids] of Object.entries(updates)) {
      if (!ids.length) continue;
      // Chunked so a large desk does not build a single enormous IN list.
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        await queryInterface.sequelize.query(
          "UPDATE support_ticket SET status = :status, updatedAt = updatedAt WHERE id IN (:ids)",
          { replacements: { status, ids: chunk } }
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `[support-ticket-status-repair] ${ids.length} ticket(s) -> ${status}`
      );
    }
  },

  async down() {
    // Deliberately empty: the pre-repair values conflated two opposite states,
    // so there is no correct value to put back.
  },
};
