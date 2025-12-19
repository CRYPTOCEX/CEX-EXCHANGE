"use client";

import { Shield, ClipboardList, CheckSquare, CalendarIcon, Truck, Package, Settings, DollarSign } from "lucide-react";
import { format } from "date-fns";
import type { FormConfig } from "@/components/blocks/data-table/types/table";

import { useTranslations } from "next-intl";
export function useColumns(): ColumnDefinition[] {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  return [
    {
      key: "id",
      title: tCommon("id"),
      type: "text",
      icon: Shield,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("unique_identifier_for_the_shipping_record"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "loadId",
      title: tExt("load_id_1"),
      type: "text",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("tracking_number_for_the_shipment"),
      priority: 1,
    },
    {
      key: "loadStatus",
      title: tCommon("status"),
      type: "select",
      icon: CheckSquare,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("current_shipping_and_delivery_status"),
      options: [
        { value: "PENDING", label: tCommon("pending") },
        { value: "TRANSIT", label: tExtAdmin("transit") },
        { value: "DELIVERED", label: tExt("delivered") },
        { value: "CANCELLED", label: tCommon("cancelled") },
      ],
      priority: 1,
      render: {
        type: "badge",
        config: {
          variant: (value) => {
            switch (value) {
              case "PENDING":
                return "warning";
              case "TRANSIT":
                return "warning";
              case "DELIVERED":
                return "success";
              case "CANCELLED":
                return "destructive";
              default:
                return "secondary";
            }
          },
        },
      },
    },
    {
      key: "shipper",
      title: tExt("shipper_1"),
      type: "text",
      icon: Truck,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("shipping_company_or_carrier_name"),
      priority: 1,
    },
    {
      key: "transporter",
      title: tExt("transporter_1"),
      type: "text",
      icon: Truck,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("transportation_provider_handling_the_delivery"),
      priority: 2,
    },
    {
      key: "goodsType",
      title: tExt("goods_type_1"),
      type: "text",
      icon: Package,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("category_or_type_of_goods_being_shipped"),
      priority: 2,
    },
    {
      key: "deliveryDate",
      title: tExtAdmin("delivery_date_1"),
      type: "date",
      icon: CalendarIcon,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("expected_or_actual_delivery_date"),
      render: { type: "date", format: "PPP" },
      priority: 2,
    },
    {
      key: "weight",
      title: tExt("weight_1"),
      type: "number",
      icon: Package,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_weight_of_the_goods_being_shipped"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "volume",
      title: tCommon("volume"),
      type: "number",
      icon: Package,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("total_volume_of_the_goods_being_shipped"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "vehicle",
      title: tExt("vehicle_1"),
      type: "text",
      icon: Truck,
      sortable: true,
      searchable: true,
      filterable: true,
      description: tExtAdmin("type_of_vehicle_used_for_transportation"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "cost",
      title: tCommon('cost'),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("base_shipping_cost_before_tax"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "tax",
      title: tExt("tax"),
      type: "number",
      icon: DollarSign,
      sortable: true,
      searchable: false,
      filterable: true,
      description: tExtAdmin("tax_amount_applied_to_shipping"),
      priority: 3,
      expandedOnly: true,
    },
    {
      key: "description",
      title: tCommon("description"),
      type: "text",
      icon: ClipboardList,
      sortable: false,
      searchable: true,
      filterable: false,
      description: tExtAdmin("additional_notes_or_shipping_instructions"),
      priority: 3,
      expandedOnly: true,
    },
  ];
}

export function useFormConfig(): FormConfig {
  const tCommon = useTranslations("common");
  const tExt = useTranslations("ext");
  const tExtAdmin = useTranslations("ext_admin");
  const tDashboardAdmin = useTranslations("dashboard_admin");
  return {
    create: {
      title: tExtAdmin("create_new_shipment"),
      description: tExtAdmin("add_a_new_shipping_record_with"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Package,
          priority: 1,
          fields: [
            { key: "loadId", required: true },
            { key: "description", required: true },
          ],
        },
        {
          id: "carrier-info",
          title: tExtAdmin("carrier_information"),
          icon: Truck,
          priority: 2,
          fields: [
            { key: "shipper", required: true },
            { key: "transporter", required: true },
            { key: "vehicle", required: true },
          ],
        },
        {
          id: "goods-info",
          title: tExtAdmin("goods_information"),
          icon: Package,
          priority: 3,
          fields: [
            { key: "goodsType", required: true },
            { key: "weight", required: true, min: 0 },
            { key: "volume", required: true, min: 0 },
          ],
        },
        {
          id: "costs",
          title: tExtAdmin("costs"),
          icon: DollarSign,
          priority: 4,
          fields: [
            { key: "cost", required: true, min: 0 },
            { key: "tax", required: true, min: 0 },
          ],
        },
        {
          id: "delivery",
          title: tExtAdmin("delivery"),
          icon: CalendarIcon,
          priority: 5,
          fields: [{ key: "deliveryDate", required: true }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 6,
          fields: [
            {
              key: "loadStatus",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "TRANSIT", label: tExtAdmin("transit") },
                { value: "DELIVERED", label: tExt("delivered") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
          ],
        },
      ],
    },
    edit: {
      title: tExtAdmin("edit_shipment"),
      description: tExtAdmin("update_shipping_information_delivery_status_carrie"),
      groups: [
        {
          id: "basic-info",
          title: tDashboardAdmin("basic_information"),
          icon: Package,
          priority: 1,
          fields: [
            { key: "loadId", required: true },
            { key: "description", required: true },
          ],
        },
        {
          id: "carrier-info",
          title: tExtAdmin("carrier_information"),
          icon: Truck,
          priority: 2,
          fields: [
            { key: "shipper", required: true },
            { key: "transporter", required: true },
            { key: "vehicle", required: true },
          ],
        },
        {
          id: "goods-info",
          title: tExtAdmin("goods_information"),
          icon: Package,
          priority: 3,
          fields: [
            { key: "goodsType", required: true },
            { key: "weight", required: true, min: 0 },
            { key: "volume", required: true, min: 0 },
          ],
        },
        {
          id: "costs",
          title: tExtAdmin("costs"),
          icon: DollarSign,
          priority: 4,
          fields: [
            { key: "cost", required: true, min: 0 },
            { key: "tax", required: true, min: 0 },
          ],
        },
        {
          id: "delivery",
          title: tExtAdmin("delivery"),
          icon: CalendarIcon,
          priority: 5,
          fields: [{ key: "deliveryDate", required: true }],
        },
        {
          id: "status",
          title: tCommon("status"),
          icon: Settings,
          priority: 6,
          fields: [
            {
              key: "loadStatus",
              required: true,
              options: [
                { value: "PENDING", label: tCommon("pending") },
                { value: "TRANSIT", label: tExtAdmin("transit") },
                { value: "DELIVERED", label: tExt("delivered") },
                { value: "CANCELLED", label: tCommon("cancelled") },
              ],
            },
          ],
        },
      ],
    },
  };
}
