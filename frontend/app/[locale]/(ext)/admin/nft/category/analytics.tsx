import { AnalyticsConfig } from "@/components/blocks/data-table/types/analytics";

/**
 * Categories — small and honest.
 *
 * `nftCategory` has one boolean, no money, no dates worth plotting and a few
 * dozen rows. The page it replaces spent three tiles and a pie on that one
 * boolean and got it wrong twice over: `status` is a tinyint(1), so
 * `value: true` compiled to `status = 'true'` → `= 0` and the "Active" card
 * counted INACTIVE rows, while `value: false` was falsy, was dropped before
 * SQL, and rendered 0 forever. The pie registered both slices as the SAME
 * comparison, so it was a permanent 50/50 split of the inactive population.
 * The line chart's third series had no alias at all.
 *
 * Everything a category admin actually wants — collections per category,
 * uncategorised collections, GMV by category — reads `nftCollection` or
 * `nftSale`, and the per-item `model` is cosmetic: the engine runs the model
 * the DataTable mounts. Those four metrics are therefore not expressible here
 * and are omitted rather than faked.
 *
 * Every card is a snapshot: a category disabled last year is still disabled,
 * and a `createdAt BETWEEN` window on a taxonomy edited twice a year shows
 * nothing at all.
 */
export const nftCategoryAnalytics: AnalyticsConfig = [
  {
    type: "kpi",
    responsive: {
      mobile: { cols: 1, span: 1 },
      tablet: { cols: 2, span: 1 },
      desktop: { cols: 3, span: 1 },
    },
    items: [
      {
        id: "categories_missing_image",
        title: "Missing Cover Image",
        metric: "noImage",
        model: "nftCategory",
        // A category with no image is a broken tile in storefront navigation.
        aggregation: {
          op: "count",
          field: "id",
          where: [{ field: "image", value: null }],
        },
        valueMode: "current",
        format: "number",
        invert: true,
        icon: "mdi:image-off-outline",
      },
      {
        id: "categories_missing_description",
        title: "Missing Description",
        metric: "noDescription",
        model: "nftCategory",
        aggregation: {
          op: "count",
          field: "id",
          where: [{ field: "description", value: null }],
        },
        valueMode: "current",
        format: "number",
        invert: true,
        icon: "mdi:text-box-remove-outline",
      },
      {
        id: "inactive_categories",
        title: "Inactive Categories",
        metric: "inactiveCategories",
        model: "nftCategory",
        // `status` is a BOOLEAN despite the name. The engine reads the model's
        // attribute type and emits `= 0`, so this finally counts what it says.
        aggregation: { field: "status", value: "false" },
        valueMode: "current",
        format: "number",
        invert: true,
        icon: "mdi:minus-circle-outline",
      },
      {
        id: "active_categories",
        title: "Active Categories",
        metric: "activeCategories",
        model: "nftCategory",
        aggregation: { field: "status", value: "true" },
        valueMode: "current",
        format: "number",
        icon: "mdi:check-circle-outline",
      },
      {
        id: "total_categories",
        title: "Total Categories",
        metric: "allCategories",
        model: "nftCategory",
        aggregation: { op: "count", field: "id" },
        valueMode: "current",
        format: "number",
        icon: "mdi:tag-multiple",
      },
      {
        id: "active_share",
        title: "Active Share",
        metric: "activeShare",
        model: "nftCategory",
        // `allCategories` (COUNT(id), valueMode:"current") and NOT the free
        // `total`. Both operands have to be snapshots: `total` is the WINDOW
        // row count, so a share of an all-time numerator over it read 0% on a
        // 30d view of five categories that are all active, and 100% on a 1y
        // view of the same five — a figure that moved with the timeframe
        // picker while the population it describes never changed.
        derived: { op: "percent", of: ["activeCategories", "allCategories"] },
        format: "percent",
        icon: "mdi:chart-donut",
      },
    ],
  },
] satisfies AnalyticsConfig;
