/**
 * What to suggest asking, based on the screen the administrator is standing on.
 *
 * ---------------------------------------------------------------------------
 * AN EMPTY BOX IS THE WORST OPENING STATE A FEATURE LIKE THIS CAN HAVE
 * ---------------------------------------------------------------------------
 * An administrator who opens an assistant and finds a blank field has to guess
 * two things at once: whether it knows about this platform at all, and whether
 * it knows about the screen in front of them. Most people guess "no" to both and
 * close it.
 *
 * These answer both questions before a single request is made. They cost
 * nothing — no model call, no fetch, no state — and they are chosen to
 * demonstrate the SHAPE of question the assistant can take rather than to be
 * generically useful: one that needs live platform state, one that needs a
 * procedure. A suggestion that only needs documentation would teach the reader
 * that this is a search box.
 *
 * ---------------------------------------------------------------------------
 * MATCHED LONGEST-PREFIX-FIRST
 * ---------------------------------------------------------------------------
 * `/admin/finance/withdraw/log` must not be caught by `/admin/finance`, so the
 * table is sorted by specificity at module scope rather than relying on the
 * order somebody happened to type the entries in. That ordering bug is silent —
 * the wrong suggestions are still plausible suggestions — which is why it is
 * derived instead of maintained.
 */

export interface Openers {
  heading: string;
  questions: string[];
}

const DEFAULT: Openers = {
  heading: "Try asking",
  questions: [
    "What is waiting for me right now?",
    "Is everything connected and configured?",
    "What was changed on this platform recently?",
  ],
};

const BY_PREFIX: Record<string, Openers> = {
  "/admin/finance/withdraw": {
    heading: "About withdrawals",
    questions: [
      "How many withdrawals are waiting, and how old is the oldest?",
      "Why would a withdrawal be stuck, and what do I check?",
      "How do I change whether withdrawals need approval?",
    ],
  },
  "/admin/finance/deposit": {
    heading: "About deposits",
    questions: [
      "How many deposits are waiting for me?",
      "Walk me through setting up deposits properly.",
      "A gateway is configured but customers see no options — why?",
    ],
  },
  "/admin/finance": {
    heading: "About money",
    questions: [
      "What is waiting in the money queues?",
      "Where does platform revenue come from and how do I check it?",
      "Walk me through working out why a payment is stuck.",
    ],
  },
  "/admin/crm/kyc": {
    heading: "About verification",
    questions: [
      "How many verifications are waiting for review?",
      "Walk me through setting up identity verification.",
      "What happens to a customer when I reject their application?",
    ],
  },
  "/admin/crm/role": {
    heading: "About access",
    questions: [
      "Walk me through giving a colleague admin access.",
      "A colleague was granted a permission and is still refused — why?",
      "Which permissions let somebody approve withdrawals?",
    ],
  },
  "/admin/crm/support": {
    heading: "About the desk",
    questions: [
      "How many tickets are waiting for a reply?",
      "What is waiting for me across every queue?",
      "How do I stop the assistant answering a particular customer?",
    ],
  },
  "/admin/crm": {
    heading: "About people",
    questions: [
      "What is waiting for me across every queue?",
      "Walk me through giving a colleague admin access.",
      "How do I find out what a specific administrator changed?",
    ],
  },
  "/admin/system/settings": {
    heading: "About settings",
    questions: [
      "I changed a setting and nothing happened.",
      "Which settings can only a Super Admin change, and why?",
      "What do the withdrawal approval settings actually do?",
    ],
  },
  "/admin/system/update": {
    heading: "About updating",
    questions: [
      "Walk me through preparing for an update.",
      "What version am I on and is there a newer one?",
      "What breaks if an addon is left behind a platform update?",
    ],
  },
  "/admin/system/extension": {
    heading: "About addons",
    questions: [
      "Which addons are enabled on this platform?",
      "Walk me through preparing for an update.",
      "An addon screen renders empty — what do I check?",
    ],
  },
  "/admin/system": {
    heading: "About the platform",
    questions: [
      "Is everything connected and configured?",
      "I changed a setting and nothing happened.",
      "What was changed on this platform recently?",
    ],
  },
  "/admin/ai/support": {
    heading: "About the assistant",
    questions: [
      "Walk me through getting the customer assistant answering.",
      "It is handing off too often — how do I improve that?",
      "What can the assistant do to a customer's account?",
    ],
  },
};

/*
 * Longest first, so a specific screen always beats the section above it.
 * Derived rather than maintained — see the note at the top.
 */
const ORDERED = Object.keys(BY_PREFIX).sort((a, b) => b.length - a.length);

export function OPENERS_FOR(pathname: string): Openers {
  for (const prefix of ORDERED) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return BY_PREFIX[prefix];
    }
  }
  return DEFAULT;
}
