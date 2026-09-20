import { makeSeriesCard } from "../series-card";

/**
 * `type: "line"` is the most-used chart in the product — 78 of the 225 charts
 * across the 65 analytics configs — and every one of them drew a filled AREA,
 * because this file asked `makeSeriesCard` for `"area"`.
 *
 * The fill is the smaller half of it. These configs are overwhelmingly
 * MULTI-series (`["total", "COMPLETED", "PENDING", "FAILED"]`), and stacked
 * translucent gradients laid over one another cannot be compared against each
 * other — which is the entire reason to plot four series on one axis. Strokes
 * can. The area card still exists and is what `stackedArea` renders.
 *
 * The description is `null` deliberately; see `makeSeriesCard`.
 */
export const ChartCard = makeSeriesCard("line", null, "ChartCard");

export default ChartCard;
