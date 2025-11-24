import fs from "fs/promises";
import {
  FindAndCountOptions,
  Model,
  ModelStatic,
  Op,
  WhereOptions,
} from "sequelize";
import { createError } from "./error";
import { models, sequelize } from "@b/db";
import path from "path";
import { sanitizePath } from "./validation";

// Mapping of operators remains unchanged.
const operatorMap = {
  equal: Op.eq,
  notEqual: Op.ne,
  greaterThan: Op.gt,
  greaterThanOrEqual: Op.gte,
  lessThan: Op.lt,
  lessThanOrEqual: Op.lte,
  between: Op.between,
  notBetween: Op.notBetween,
  like: Op.like,
  notLike: Op.notLike,
  startsWith: Op.startsWith,
  endsWith: Op.endsWith,
  substring: Op.substring,
  regexp: Op.regexp,
  notRegexp: Op.notRegexp,
  contains: Op.like,
};

type OrderElement = Array<
  string | { model: ModelStatic<Model<any, any>>; as: string }
>;

export async function getFiltered({
  model,
  query,
  where,
  customFilterHandler,
  customStatus,
  sortField = "createdAt",
  timestamps = true,
  paranoid = true,
  numericFields = [],
  includeModels = [],
  excludeFields = [],
  excludeRecords = [],
  compute = [],
}: {
  model: ModelStatic<Model<any, any>>;
} & FetchParams): Promise<{
  items: Model<any, any>[];
  pagination: any;
}> {
  const page = Number(query.page) || 1;
  const perPage = Number(query.perPage) || 10;
  const offset = (page - 1) * perPage;

  // Decode sortOrder and sortField in case they are URL encoded.
  let sortOrderQuery = query.sortOrder || "desc";
  if (typeof sortOrderQuery === "string") {
    sortOrderQuery = decodeURIComponent(sortOrderQuery);
  }

  if (typeof sortField === "string") {
    sortField = decodeURIComponent(sortField);
  }

  // Convert sortField into array of fields
  let sortFields: string[] = [];
  if (typeof sortField === "string") {
    sortFields = sortField
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(sortField)) {
    sortFields = sortField;
  } else {
    sortFields = [sortField];
  }

  // Convert sortOrder into array of orders
  let sortOrders: string[] = [];
  if (typeof sortOrderQuery === "string") {
    sortOrders = sortOrderQuery
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (Array.isArray(sortOrderQuery)) {
    sortOrders = sortOrderQuery;
  } else {
    sortOrders = [sortOrderQuery];
  }

  // Build "order" array
  const order: OrderElement[] = sortFields.map((field, index) => {
    const currentSortOrder: "ASC" | "DESC" =
      sortOrders[index] && sortOrders[index].toLowerCase() === "asc"
        ? "ASC"
        : "DESC";

    if (field.includes(".")) {
      const parts = field.split(".");
      const orderArr: OrderElement = [];
      let currentModel: ModelStatic<Model<any, any>> = model;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (currentModel.associations && currentModel.associations[part]) {
          const association = currentModel.associations[part];
          orderArr.push({ model: association.target, as: part });
          currentModel = association.target;
        } else {
          orderArr.push(part);
        }
      }
      orderArr.push(parts[parts.length - 1]);
      orderArr.push(currentSortOrder);
      return orderArr;
    } else {
      return [field, currentSortOrder];
    }
  });

  // Build filters
  const rawFilter = parseFilterParam(query.filter, numericFields);
  const { nestedFilters, directFilters } = buildNestedFilters(rawFilter);

  const whereClause: WhereOptions = {
    ...where,
    ...(customFilterHandler ? customFilterHandler(directFilters) : {}),
  };

  excludeRecords.forEach((exclude) => {
    if (!exclude.model) {
      whereClause[exclude.key] = { [Op.ne]: exclude.value };
    }
  });

  customStatus?.forEach(({ key, true: trueValue, false: falseValue }) => {
    if (Object.prototype.hasOwnProperty.call(directFilters, key)) {
      const statusValue = directFilters[key];
      if (statusValue === "true") {
        whereClause[key] = trueValue;
      } else if (statusValue === "false") {
        whereClause[key] = falseValue;
      }
      delete directFilters[key];
    }
  });

  Object.entries(directFilters as { [key: string]: any }).forEach(
    ([key, filterValue]) => {
      if (numericFields.includes(key) && typeof filterValue !== "object") {
        whereClause[key] = parseFloat(filterValue) || filterValue;
      } else if (typeof filterValue === "object" && filterValue.operator) {
        const { value, operator } = filterValue;
        const op = operatorMap[operator];
        whereClause[key] = { [op]: value };
      } else {
        whereClause[key] = filterValue;
      }
    }
  );

  let hasParanoid: any = !query.showDeleted;
  if (timestamps && paranoid) {
    if (query.showDeleted === "true") {
      whereClause[Op.and as any] = { deletedAt: { [Op.ne]: null } };
    } else {
      whereClause[Op.and as any] = { deletedAt: null };
    }
  } else {
    hasParanoid = undefined;
  }

  const adjustedIncludeModels = adjustIncludeModels(
    includeModels,
    excludeRecords,
    nestedFilters
  );

  // Build attributes, adding compute fields if any
  const attributes =
    compute && compute.length > 0
      ? { include: compute, exclude: excludeFields }
      : { exclude: excludeFields };

  const findOptions: FindAndCountOptions = {
    where: whereClause,
    offset,
    limit: perPage,
    include: adjustedIncludeModels,
    distinct: true,
    col: "id",
    attributes,
    order: order as any,
    paranoid: hasParanoid,
  };

  const { count, rows } = await model.findAndCountAll(findOptions);

  return {
    items: rows.map((row) => row.get({ plain: true })),
    pagination: {
      totalItems: Array.isArray(count) ? count.length : count,
      currentPage: page,
      perPage,
      totalPages: Math.ceil(
        (Array.isArray(count) ? count.length : count) / perPage
      ),
    },
  };
}

function adjustIncludeModels(includeModels, excludeRecords, filters) {
  return includeModels.map((includeModel) => {
    // Retrieve exclusion rules specifically for this model
    const exclusions = excludeRecords.filter(
      (exclude) => exclude.model === includeModel.model
    );

    // Build the 'where' condition using filters specifically for its alias, if available
    const specificFilters = filters[includeModel.as] || {};
    const where = {
      ...includeModel.where, // Preserve existing conditions
      ...specificFilters, // Apply specific filters
      ...(exclusions.length
        ? {
            [Op.and]: exclusions.map((exclude) => ({
              [exclude.key]: { [Op.ne]: exclude.value },
            })),
          }
        : {}),
    };

    // Set 'required' to false unless explicitly specified
    const required =
      specificFilters && Object.keys(specificFilters).length > 0
        ? true
        : includeModel.required || false;

    // Recursively adjust nested include models, if they exist
    const nestedIncludes = includeModel.includeModels
      ? adjustIncludeModels(includeModel.includeModels, excludeRecords, filters)
      : includeModel.include || [];

    return {
      ...includeModel,
      where,
      include: nestedIncludes,
      required,
    };
  });
}

export function parseFilterParam(
  filterParam: string | string[] | undefined,
  numericFields: string[]
): { [key: string]: any } {
  const parsedFilters = {};
  if (!filterParam) return parsedFilters;

  let filtersObject = {};
  if (typeof filterParam === "string") {
    try {
      filtersObject = JSON.parse(filterParam);
    } catch (error) {
      console.error("Error parsing filter param:", error);
      return parsedFilters;
    }
  }

  Object.entries(filtersObject as { [key: string]: any }).forEach(
    ([key, value]) => {
      const keyParts = key.split(".");
      let current = parsedFilters;
      // Iterate through key parts except the last one to navigate/build the nested structure
      keyParts.slice(0, -1).forEach((part) => {
        current[part] = current[part] || {};
        current = current[part];
      });

      // Check if the last part of the key path is a numeric field
      const isNumericField = numericFields.includes(
        keyParts[keyParts.length - 1]
      );
      let finalValue = value;
      if (
        isNumericField &&
        typeof value === "object" &&
        value.operator === "startsWith"
      ) {
        finalValue = {
          operator: "greaterThan",
          value: parseFloat(value.value),
        }; // Convert startsWith to greaterThan and parse value as float
      }

      // Assign the possibly modified value to the last part of the key path
      current[keyParts[keyParts.length - 1]] = finalValue;
    }
  );

  return parsedFilters;
}

function buildNestedFilters(filters) {
  const nestedFilters = {};
  const directFilters = {};

  Object.entries(
    filters as
      | { [key: string]: any }
      | { [key: string]: { operator: string; value: any } }
  ).forEach(([fullKey, value]) => {
    // Check if the value is a direct filter
    if (
      typeof value === "boolean" ||
      (typeof value === "object" && "operator" in value && "value" in value)
    ) {
      directFilters[fullKey] = value;
    } else {
      // Otherwise, it's a nested filter
      const keys = fullKey.split(".");
      let current = nestedFilters;

      // Iterate over the key parts to deeply nest, except for the last part
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        current[key] = current[key] || {};
        current = current[key];
      }

      // Apply the filter to the last key part
      const lastKey = keys[keys.length - 1];
      current[lastKey] = value;
    }
  });

  return { nestedFilters: applyOperatorMapping(nestedFilters), directFilters };
}

function applyOperatorMapping(filters) {
  const whereClause = {};

  const processFilters = (currentFilters, parentObject) => {
    Object.entries(currentFilters as { [key: string]: any }).forEach(
      ([key, value]) => {
        if (
          value &&
          typeof value === "object" &&
          value.operator &&
          operatorMap[value.operator]
        ) {
          // It's an object with a recognized operator
          parentObject[key] = { [operatorMap[value.operator]]: value.value };
        } else if (value && typeof value === "object" && !value.operator) {
          // It's a nested object, recurse further
          parentObject[key] = {};
          processFilters(value, parentObject[key]);
        } else {
          // It's a direct value
          parentObject[key] = value;
        }
      }
    );
  };

  processFilters(filters, whereClause);
  return whereClause;
}

/*
 * Update the status of a record
 */

export async function updateStatus(
  model: string,
  id: string,
  fieldValue: boolean,
  field: string = "status",
  modelTitle: string = "Record",
  postUpdate?: (id: string) => Promise<void>,
  where?: Record<string, any>
): Promise<{ message: string }> {
  if (!models[model]) {
    throw createError({
      statusCode: 400,
      message: "Invalid model",
    });
  }
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Missing ID",
    });
  }
  if (fieldValue === undefined) {
    throw createError({
      statusCode: 400,
      message: "Missing field value",
    });
  }
  if (!field) {
    throw createError({
      statusCode: 400,
      message: "Missing field name",
    });
  }

  try {
    const updateFields = {};
    updateFields[field] = fieldValue;

    await models[model].update(updateFields, {
      where: {
        id,
        ...where,
      },
    });

    const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);
    const message = `${
      modelTitle ? modelTitle : capitalModel + " " + field
    } updated successfully`;

    if (postUpdate) {
      await postUpdate(id);
    }

    return { message };
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
}

export const unauthorizedResponse = {
  description: "Unauthorized, admin permission required",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
};
export const notFoundMetadataResponse = (model) => ({
  description: `${model} not found`,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
});

export const serverErrorResponse = {
  description: "Internal server error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
};

export const invalidRequestResponse = {
  description: "Invalid request",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Error message",
          },
        },
      },
    },
  },
};

export const deleteRecordResponses = (model) => {
  return {
    200: {
      description: `${model} deleted successfully`,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description:
                  "Confirmation message indicating successful deletion",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse(model),
    500: serverErrorResponse,
  };
};

export const updateRecordResponses = (model) => {
  return {
    200: {
      description: `${model} updated successfully`,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Confirmation message",
              },
            },
          },
        },
      },
    },
    400: invalidRequestResponse,
    401: unauthorizedResponse,
    404: notFoundMetadataResponse(model),
    500: serverErrorResponse,
  };
};

export const storeRecordResponses = (success, model) => {
  return {
    200: success,
    400: invalidRequestResponse,
    401: unauthorizedResponse,
    404: notFoundMetadataResponse(model),
    500: serverErrorResponse,
  };
};

export const createRecordResponses = (model) => {
  return {
    200: {
      description: `${model} created successfully`,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Confirmation message",
              },
            },
          },
        },
      },
    },
    400: invalidRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  };
};

function resolveIncludes(includes?: includeModel[]): any[] | undefined {
  if (!includes) {
    return undefined;
  }

  return includes.map((include) => {
    const { model, as, attributes, includeModels, through, required, paranoid } = include;

    const resolvedInclude: any = {
      model,
      as,
      attributes: attributes?.map((attr) =>
        Array.isArray(attr) ? attr : [attr, attr]
      ),
      required,
    };

    if (paranoid !== undefined) {
      resolvedInclude.paranoid = paranoid;
    }

    if (includeModels) {
      resolvedInclude.include = resolveIncludes(includeModels);
    }

    if (through) {
      resolvedInclude.through = through;
    }

    return resolvedInclude;
  });
}

export async function getRecord<T extends Model>(
  modelName: string,
  id: string,
  include?: includeModel[],
  exclude: string[] = []
): Promise<T | null> {
  if (!id) {
    throw new Error("Missing ID");
  }

  const model = models[modelName];
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }

  const resolvedIncludes = resolveIncludes(include);

  const data = await model.findOne({
    where: { id },
    attributes: { exclude },
    include: resolvedIncludes,
  });

  if (!data) {
    throw createError({
      statusCode: 404,
      message: `Record with ID ${id} not found`,
    });
  }

  return data.get({ plain: true }) as T;
}

export async function getRecords<T extends Model>(
  modelName: string,
  ids: string[],
  include?: includeModel[],
  exclude: string[] = []
): Promise<T[]> {
  const model = models[modelName];
  if (!model) {
    throw new Error(`Model ${modelName} not found`);
  }

  const resolvedIncludes = resolveIncludes(include);

  try {
    const data = await model.findAll({
      where: { id: ids },
      attributes: { exclude },
      include: resolvedIncludes,
    });

    return data.map((item) => item.get({ plain: true })) as T[];
  } catch (error) {
    console.error(`Error fetching ${modelName}:`, error);
    throw new Error("Server error");
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  // Sanitize the file path to prevent LFI
  const sanitizedFilePath = sanitizePath(filePath);

  const fullPath = path.join(process.cwd(), "public", sanitizedFilePath);
  await fs.unlink(fullPath);
}

export async function updateRecord(
  modelName: string,
  id: string,
  updateData: Record<string, any>,
  returnResponse: boolean = false,
  relations: Array<{
    model: string;
    data: any[];
    method: string;
    fields: { source: string; target: string };
  }> = [],
  where?: Record<string, any>
): Promise<any> {
  const model = models[modelName];

  if (!model) {
    throw new Error(`Model ${modelName} not found.`);
  }

  const transaction = await sequelize.transaction();
  try {
    const existingRecord = await model.findByPk(id, { transaction });
    if (!existingRecord) {
      throw new Error(`${modelName} with ID ${id} not found.`);
    }

    await model.update(updateData, { where: { id, ...where }, transaction });

    for (const relation of relations) {
      const relatedModel = models[relation.model];
      if (!relatedModel) {
        console.error(`Related model ${relation.model} not found.`);
        continue;
      }

      const existingRelations = await relatedModel.findAll({
        where: { [relation.fields.source]: id },
        transaction,
      });

      const newRelationsMap = new Map(
        relation.data.map((item) => [item, item])
      );

      const toDelete = existingRelations.filter(
        (item) => !newRelationsMap.has(item[relation.fields.target])
      );
      await Promise.all(toDelete.map((item) => item.destroy({ transaction })));

      for (const newItem of relation.data) {
        const existingItem = existingRelations.find(
          (item) => item[relation.fields.target] === newItem
        );
        if (existingItem) {
          await existingItem.update(newItem, { transaction });
        } else {
          await relatedModel.create(
            {
              [relation.fields.source]: id,
              [relation.fields.target]: newItem,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    if (returnResponse) {
      return model.findByPk(id);
    } else {
      return { message: `${modelName} updated successfully` };
    }
  } catch (error) {
    console.error(`Error occurred, rolling back transaction. Error: ${error}`);
    await transaction.rollback();
    throw error;
  }
}

export async function storeRecord({
  model,
  data,
  relations,
  returnResponse = false,
}: {
  model: string;
  data: Record<string, any>;
  relations?: Array<{
    model: string;
    data: any[];
    method: string;
    fields: { source: string; target: string };
  }>;
  returnResponse?: boolean;
}): Promise<any> {
  const Model = models[model];

  if (!Model) {
    throw new Error(`Model ${model} not found.`);
  }

  const transaction = await sequelize.transaction();
  try {
    // Ensure customFields is an array or null
    if (data.customFields === undefined || data.customFields === null) {
      data.customFields = [];
    }

    // Ensure customFields is an array
    if (!Array.isArray(data.customFields)) {
      throw new Error("customFields must be an array");
    }

    const newRecord = await Model.create(data, { transaction });

    if (relations && Array.isArray(relations)) {
      for (const relation of relations) {
        const relatedModel = models[relation.model];
        if (!relatedModel) {
          console.error(`Related model ${relation.model} not found.`);
          continue;
        }

        // Ensure relation.data is an array before processing
        if (Array.isArray(relation.data)) {
          // Update existing relations and create new ones
          for (const newItem of relation.data) {
            await relatedModel.create(
              {
                [relation.fields.source]: newRecord.id,
                [relation.fields.target]: newItem,
              },
              { transaction }
            );
          }
        } else {
          console.error(`Relation data for ${relation.model} is not an array.`);
        }
      }
    }

    await transaction.commit();

    if (returnResponse) {
      return {
        record: newRecord.get({ plain: true }),
        message: `${model} created successfully`,
      };
    } else {
      return { message: `${model} created successfully` };
    }
  } catch (error) {
    console.error(`Error occurred, rolling back transaction. Error: ${error}`);
    await transaction.rollback();
    throw error;
  }
}

export const commonBulkDeleteParams = (model) => {
  return [
    {
      name: "restore",
      in: "query",
      description: `Restore the ${model} instead of deleting`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
    {
      name: "force",
      in: "query",
      description: `Delete the ${model} permanently`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ] as ParameterObject[];
};

export const commonBulkDeleteResponses = (model) => {
  return {
    200: {
      description: `${model} deleted successfully`,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Confirmation message",
              },
            },
          },
        },
      },
    },
    400: invalidRequestResponse,
    401: unauthorizedResponse,
    404: notFoundMetadataResponse(model),
    500: serverErrorResponse,
  };
};

export const deleteRecordParams = (model) => {
  return [
    {
      index: 0,
      name: "id",
      in: "path",
      description: `ID of the ${model} to delete`,
      required: true,
      schema: {
        type: "string",
      },
    },
    {
      name: "restore",
      in: "query",
      description: `Restore the ${model} instead of deleting`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
    {
      name: "force",
      in: "query",
      description: `Delete the ${model} permanently`,
      required: false,
      schema: {
        type: "boolean",
      },
    },
  ] as ParameterObject[];
};

type SingleDeleteParams = {
  model: string;
  query: { restore?: string; force?: string };
  where?: Record<string, any>;
  id: string;
  preDelete?: () => Promise<void>;
  postDelete?: () => Promise<void>;
  restoreRelated?: () => Promise<void>;
};

export async function handleSingleDelete({
  model,
  query,
  where = {},
  id,
  preDelete = async () => Promise.resolve(),
  postDelete = async () => Promise.resolve(),
  restoreRelated = async () => Promise.resolve(),
}: SingleDeleteParams): Promise<{ message: string }> {
  if (!models[model]) {
    throw createError({
      statusCode: 400,
      message: "Invalid model",
    });
  }
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Missing ID",
    });
  }

  try {
    const whereClause = { ...where, id };
    const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);

    await preDelete(); // Perform any actions required before deletion or restoration

    if (query.restore) {
      await models[model].restore({ where: whereClause });
      await restoreRelated(); // Restore related records
      await postDelete(); // Perform any cleanup after restoration
      return { message: `${capitalModel} restored successfully.` };
    } else if (query.force) {
      await models[model].destroy({
        where: whereClause,
        force: true,
      });
      await postDelete(); // Perform any cleanup after forced deletion
      return { message: `${capitalModel} deleted permanently.` };
    } else {
      await models[model].destroy({ where: whereClause });
      await postDelete(); // Perform any cleanup after standard deletion
      return { message: `${capitalModel} deleted successfully.` };
    }
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
}

type BulkDeleteParams = {
  model: string;
  ids: string[];
  query: { restore?: boolean; force?: boolean };
  where?: Record<string, any>;
  preDelete?: () => Promise<void>;
  postDelete?: () => Promise<void>;
  restoreRelated?: () => Promise<void>;
};

export async function handleBulkDelete({
  model,
  ids,
  query,
  where = {},
  preDelete = async () => Promise.resolve(),
  postDelete = async () => Promise.resolve(),
  restoreRelated = async () => Promise.resolve(),
}: BulkDeleteParams): Promise<{ message: string }> {
  if (!models[model]) {
    throw createError({
      statusCode: 400,
      message: `Invalid model: ${model}`,
    });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: "Missing IDs",
    });
  }

  try {
    const whereClause = { ...where, id: ids };
    const capitalModel = model.charAt(0).toUpperCase() + model.slice(1);

    await preDelete(); // Perform any actions required before deletion or restoration

    if (query.restore) {
      await models[model].restore({ where: whereClause });
      await restoreRelated(); // Restore related records
      await postDelete(); // Perform any cleanup after restoration
      return { message: `${capitalModel} records restored successfully.` };
    } else if (query.force) {
      await models[model].destroy({
        where: whereClause,
        force: true,
      });
      await postDelete(); // Perform any cleanup after forced deletion
      return { message: `${capitalModel} records deleted permanently.` };
    } else {
      await models[model].destroy({ where: whereClause });
      await postDelete(); // Perform any cleanup after standard deletion
      return { message: `${capitalModel} records deleted successfully.` };
    }
  } catch (error) {
    console.error(error);
    throw createError({
      statusCode: 500,
      message: error.message,
    });
  }
}
