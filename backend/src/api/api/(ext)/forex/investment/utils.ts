import { baseStringSchema, baseNumberSchema } from "@b/utils/schema";

export const baseForexInvestmentSchema = {
  id: baseStringSchema("Forex investment ID"),
  userId: baseStringSchema("User ID"),
  accountId: baseStringSchema("Forex account ID"),
  planId: baseStringSchema("Forex plan ID"),
  durationId: baseStringSchema("Forex duration ID"),
  amount: baseNumberSchema("Investment amount"),
  status: baseStringSchema("Investment status"),
  returns: baseNumberSchema("Investment returns"),
  startDate: baseStringSchema("Investment start date"),
  endDate: baseStringSchema("Investment end date"),
  plan: {
    type: "object",
    properties: {
      id: baseStringSchema("Forex plan ID"),
      name: baseStringSchema("Plan name"),
      title: baseStringSchema("Plan title"),
      description: baseStringSchema("Plan description"),
      profit_percentage: baseNumberSchema("Plan profit percentage"),
      image: baseStringSchema("Plan image URL"),
    },
    required: [
      "id",
      "name",
      "title",
      "description",
      "profit_percentage",
      "image",
    ],
  },
  user: {
    type: "object",
    properties: {
      id: baseStringSchema("User ID"),
      uuid: baseStringSchema("User UUID"),
      avatar: baseStringSchema("User avatar URL", 255, 0, true),
      first_name: baseStringSchema("User first name"),
      last_name: baseStringSchema("User last name"),
    },
    required: ["id", "uuid", "avatar", "first_name", "last_name"],
  },
  duration: {
    type: "object",
    properties: {
      id: baseStringSchema("Forex duration ID"),
      duration: baseNumberSchema("Duration"),
      timeframe: baseStringSchema("Timeframe"),
    },
    required: ["id", "duration", "timeframe"],
  },
};
