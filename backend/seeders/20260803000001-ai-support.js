"use strict";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require("uuid");

/**
 * AI Support Agent — first-run content.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SEEDER DELIBERATELY DOES **NOT** DO
 * ---------------------------------------------------------------------------
 * An earlier version of this file also seeded the extension row, the twelve
 * permission keys and the twenty-three settings rows. All three were wrong —
 * not merely redundant, but a second owner for data that already has one, which
 * is how two sources of truth drift apart:
 *
 *   EXTENSION ROW — belongs in `20240403000503-extensions.js`, the canonical
 *   registry every other addon uses. It also owns productId/title/link/image
 *   and re-UPDATEs them on every seed, so a copy here would be silently
 *   overwritten on the next `db:seed:all` anyway.
 *
 *   PERMISSIONS — `pnpm bundle` runs `extract:permission`, which rebuilds
 *   `20240402234643-permissions.js` from the source tree: the `permission.ts`
 *   beside each admin screen, the `permissions={{…}}` props on every DataTable,
 *   and the `permission:` metadata on every backend route. The twelve
 *   `ai.support` keys are already in that registry because they are declared in
 *   those three places. Writing them again here means a key can exist in one
 *   list and not the other.
 *
 *   SETTINGS — the addon's own `settings/index.put.ts` does findOne-then-create
 *   per key, and `utils/settings.ts` falls back to
 *   `AI_SUPPORT_SETTINGS_DEFAULTS` whenever a row is absent. So an unsaved
 *   install already behaves exactly as the seeded rows described, and the rows
 *   only became a second place to keep the default values in step.
 *
 * What remains is the content nothing else creates: a persona, the operator
 * onboarding checklist, and example escalation rules. Every block is guarded on
 * "is this table empty" rather than on individual rows, because seeders here run
 * with `seederStorage: "none"` and therefore re-run on EVERY `db:seed:all` — an
 * unguarded insert would duplicate the agent on every deploy, and a
 * row-by-row guard would resurrect a stub the operator deliberately deleted.
 */

/**
 * The onboarding checklist.
 *
 * These are the questions the shipped documentation cannot answer because they
 * are the operator's own policy — and they are what support tickets are
 * actually about. `knowledge/policy.ts` refuses to answer this class of
 * question from MashDiv's documentation, so until these are filled the agent
 * escalates them. That is the intended behaviour on a fresh install, and this
 * list is what turns it from a dead end into a to-do list.
 */
const POLICY_STUBS = [
  ["What are your withdrawal fees and how long do withdrawals take?", "Fees & limits"],
  ["What are your deposit fees and how long do deposits take to arrive?", "Fees & limits"],
  ["What are the minimum and maximum deposit and withdrawal amounts?", "Fees & limits"],
  ["What are your trading fees?", "Fees & limits"],
  ["Which countries do you not serve?", "Eligibility"],
  ["What is your refund policy?", "Policies"],
  ["How long does identity verification (KYC) usually take to review?", "Verification"],
  ["What documents do you accept for identity verification?", "Verification"],
  ["Why might an identity verification be rejected, and what should a customer do next?", "Verification"],
  ["What should a customer do if a deposit has not arrived?", "Troubleshooting"],
  ["What should a customer do if a withdrawal was rejected?", "Troubleshooting"],
  ["What are your support hours and how quickly do you reply?", "Support"],
  ["How does a customer close their account, and what happens to their balance?", "Policies"],
  ["What happens if a customer loses access to their two-factor authentication?", "Security"],
  ["Which payment methods do you support for deposits and withdrawals?", "Payments"],
];

/**
 * Default escalation rules.
 *
 * Kept deliberately small. The built-in triggers in `utils/rules.ts` already
 * cover money loss, account compromise, legal mentions and explicit requests and
 * cannot be switched off; these are the operator-visible examples that teach the
 * screen's shape.
 */
const RULES = [
  {
    name: "Hand off after three AI replies",
    priority: 10,
    matchType: "TURN_COUNT",
    matchValue: "3",
    action: "ESCALATE",
    actionValue: null,
  },
  {
    name: "Hand off when retrieval is weak",
    priority: 20,
    matchType: "CONFIDENCE",
    matchValue: "0.3",
    action: "ESCALATE",
    actionValue: null,
  },
  {
    name: "Never answer questions about taxes",
    priority: 5,
    matchType: "KEYWORD",
    matchValue: "tax, taxes, taxation, hmrc, irs, capital gains",
    action: "REFUSE",
    actionValue: null,
  },
];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const { QueryTypes } = sequelize.constructor;

    /*
     * Every block below is wrapped in `.catch(() => {})` on the same reasoning:
     * these tables are created by Sequelize `alter` sync at boot, which has not
     * necessarily run when seeders execute on a fresh install. A missing table
     * must skip the block, not abort the whole seed run and take the other
     * addons' content down with it. The admin console creates a default agent on
     * first visit if this could not.
     */

    // ---- default agent -----------------------------------------------------
    const agents = await sequelize
      .query("SELECT id FROM ai_support_agent LIMIT 1", { type: QueryTypes.SELECT })
      .catch(() => []);

    if (!agents.length) {
      const now = new Date();
      await queryInterface
        .bulkInsert("ai_support_agent", [
          {
            id: uuidv4(),
            name: "Ava",
            slug: "ava",
            avatar: null,
            persona:
              "Warm but brief. Answer in plain sentences a customer with no crypto background can follow. " +
              "Never pad an answer to sound helpful — if the answer is one sentence, write one sentence. " +
              "When something has gone wrong with a customer's money, do not reassure; get a person.",
            // Disclosure is a legal requirement, not copy. It states what the
            // agent cannot do, because that is the part customers get wrong.
            disclosureText:
              "You're chatting with an AI assistant. It can look up your account and point you to the right page. " +
              "It cannot move funds, change your account, or approve anything. " +
              'Type "human", or press Talk to a person, and we\'ll bring in a member of the team.',
            model: "claude-sonnet-5",
            effort: "low",
            maxTokens: 4000,
            // COPILOT: the AI drafts, a human presses Send. An agent that starts
            // answering customers the moment the addon is installed — before a
            // provider, a persona or a single policy answer exists — is an
            // incident, not a feature.
            autonomy: "COPILOT",
            toolsEnabled: null,
            channels: JSON.stringify(["TICKET"]),
            languages: null,
            workingHours: null,
            timezone: "UTC",
            status: true,
            createdAt: now,
            updatedAt: now,
          },
        ])
        .catch(() => {});
    }

    // ---- onboarding policy stubs ------------------------------------------
    const stubs = await sequelize
      .query("SELECT id FROM ai_support_article WHERE isPolicyStub = 1 LIMIT 1", {
        type: QueryTypes.SELECT,
      })
      .catch(() => []);

    if (!stubs.length) {
      const now = new Date();
      await queryInterface
        .bulkInsert(
          "ai_support_article",
          POLICY_STUBS.map(([question, category]) => ({
            id: uuidv4(),
            question,
            // Empty on purpose. An empty PUBLISHED article would produce a
            // confident "here is our refund policy:" followed by nothing, so
            // these ship as DRAFT and the ingester skips blank answers anyway.
            answer: "",
            category,
            productSlug: null,
            status: "DRAFT",
            isPolicyStub: true,
            sourceTicketId: null,
            approvedBy: null,
            generatedBy: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          }))
        )
        .catch(() => {});
    }

    // ---- default escalation rules -----------------------------------------
    const rules = await sequelize
      .query("SELECT id FROM ai_support_rule LIMIT 1", { type: QueryTypes.SELECT })
      .catch(() => []);

    if (!rules.length) {
      const now = new Date();
      await queryInterface
        .bulkInsert(
          "ai_support_rule",
          RULES.map((rule) => ({
            id: uuidv4(),
            ...rule,
            status: true,
            createdAt: now,
            updatedAt: now,
          }))
        )
        .catch(() => {});
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    // Only what this seeder created. The extension row, the permissions and the
    // settings belong to other seeders now, and deleting another seeder's rows
    // on rollback is how an "uninstall the addon" step quietly removes a
    // permission key three other products also demand.
    //
    // Conversation data is deliberately NOT deleted either. A down migration is
    // a schema rollback, not a data purge, and `ai_support_turn` is the
    // operator's cost record.
    await sequelize.query("DELETE FROM ai_support_rule").catch(() => {});
    await sequelize
      .query("DELETE FROM ai_support_article WHERE isPolicyStub = 1")
      .catch(() => {});
    await sequelize
      .query("DELETE FROM ai_support_agent WHERE slug = 'ava'")
      .catch(() => {});
  },
};
