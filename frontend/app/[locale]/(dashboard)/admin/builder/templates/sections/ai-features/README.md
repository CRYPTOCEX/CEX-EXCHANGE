# ai-features — UNREGISTERED, deliberately kept on disk

These ten section templates are **not offered in the page builder.** The import,
the `sectionCategories` entry, the `CategoryMeta` row and the templates-map row
were all removed from `../index.ts` on 25 Aug 2026.

## Why

Every one of them advertised a capability the platform does not have. An
operator dropping one onto a live site published a claim about a financial
product that we manufactured for them:

| Template | Claimed |
|---|---|
| `ai-chart-analysis-hero` | "AI-powered chart analysis that reads the tape for you" |
| `smart-trading-signals` | "Three signal types. One engine." — long/short/range setups |
| `predictive-analytics-grid` | predictive market analytics |
| `sentiment-analysis-feature` | "The market mood, quantified" |
| `strategy-generator` | "Describe a strategy. Get a backtested one." |
| `fraud-detection-trust` | "AI-powered fraud detection protects every trade" |
| `automated-reports` | "Monday-morning reports, delivered automatically" |
| `ai-assistant-chat-preview` | "Ask your **trading** questions in plain English" |
| `ai-learning-roadmap` | "Voice-native trading assistant", "Autonomous portfolio agents", "On-device inference", "Community model fine-tuning" |
| `try-ai-free-cta` | a 14-day free trial of all of the above |

What actually ships is the AI Support Agent (retrieval over the operator's own
documentation, with the source passage cited), the admin assistant, the AI
Market Maker and AI Investments. None of the above.

The category carried `extension: "ai"`, so it was gated — but on the AI Support
Agent addon, which provides none of these nine capabilities. The gate was too
coarse to be a gate.

## Why they were not deleted

Several become true when the billable-AI work ships (see
`plans/revenue-programme/08-WAVE-6-RECURRING.md`, task 6.4): chart explanation
over the 138 patterns the renderer already detects, and market commentary and
sentiment over the news pipeline that is already built and unused. Deleting the
layouts would throw away work that is about to be needed.

## Re-enabling one

Do it **per template**, never by restoring the category wholesale:

1. Rewrite the copy so it describes only what that build actually does.
2. Add the single template to `../index.ts` under a category that already
   exists, or re-add `ai-features` with only the templates that are true.
3. Gate it on the addon that provides the capability, not on `ai` generally.

The rule that put them here: **an operator must not be able to publish a
capability claim by dragging a section onto a page.**
