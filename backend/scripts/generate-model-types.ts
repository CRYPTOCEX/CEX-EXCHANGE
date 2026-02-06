/**
 * Auto-generates TypeScript types for all Sequelize models
 * Run with: npx ts-node scripts/generate-model-types.ts
 *
 * This script:
 * 1. Scans all model files in backend/models/
 * 2. Extracts attributes, types, and associations using AST parsing
 * 3. Merges custom types from existing .d.ts files
 * 4. Generates a comprehensive types/models.d.ts file
 */

import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Configuration
const MODELS_DIR = path.join(__dirname, "..", "models");
const OLD_TYPES_DIR = path.join(__dirname, "..", "types", "models");
const OUTPUT_FILE = path.join(__dirname, "..", "types", "models.ts");
const HASH_FILE = path.join(__dirname, "..", ".types-hash");

interface ModelAttribute {
  name: string;
  type: string;
  optional: boolean; // Whether the property has `?` in the class definition
  nullable: boolean;
  hasDefault: boolean; // Whether the attribute has a defaultValue in init()
}

interface Association {
  type: "hasOne" | "hasMany" | "belongsTo" | "belongsToMany";
  targetModel: string;
  as: string;
  foreignKey: string;
}

interface InstanceMethod {
  name: string;
  signature: string; // Full method signature e.g., "(currency?: string): number"
  returnType: string;
}

interface ModelInfo {
  className: string;
  modelName: string;
  attributes: ModelAttribute[];
  associations: Association[];
  instanceMethods: InstanceMethod[];
  filePath: string;
  exportedTypes: ExportedType[];
}

interface ExportedType {
  name: string;
  definition: string;
}

interface CustomType {
  name: string;
  definition: string;
  kind: "interface" | "type";
}

function computeModelsHash(): string {
  const hash = crypto.createHash("md5");
  const modelFiles: string[] = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        entry.name !== "init.ts" &&
        !entry.name.includes("index")
      ) {
        modelFiles.push(fullPath);
      }
    }
  }

  walkDir(MODELS_DIR);

  for (const filePath of modelFiles) {
    const relativePath = path.relative(MODELS_DIR, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    hash.update(relativePath);
    hash.update(content);
  }

  return hash.digest("hex");
}

function needsRegeneration(): boolean {
  const currentHash = computeModelsHash();

  if (fs.existsSync(HASH_FILE)) {
    const storedHash = fs.readFileSync(HASH_FILE, "utf-8").trim();
    if (storedHash === currentHash) {
      return false;
    }
  }

  return true;
}

function storeHash(): void {
  const hash = computeModelsHash();
  fs.writeFileSync(HASH_FILE, hash, "utf-8");
}

function extractEnumValues(enumCall: string): string[] | null {
  const match = enumCall.match(/DataTypes\.ENUM\s*\(([\s\S]*?)\)/);
  if (!match) return null;

  const content = match[1];
  const values: string[] = [];

  const stringMatches = content.matchAll(/"([^"]+)"|'([^']+)'/g);
  for (const m of stringMatches) {
    values.push(m[1] || m[2]);
  }

  return values.length > 0 ? values : null;
}

function parseModelFile(project: Project, filePath: string): ModelInfo | null {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const classes = sourceFile.getClasses();

  if (classes.length === 0) {
    return null;
  }

  const modelClass = classes.find(
    (c) => c.isDefaultExport() || c.getExtends()?.getText().includes("Model")
  );

  if (!modelClass) {
    return null;
  }

  const className = modelClass.getName() || path.basename(filePath, ".ts");
  const attributes: ModelAttribute[] = [];
  const associations: Association[] = [];

  let modelName = className;
  const initMethod = modelClass.getMethod("initModel");
  if (initMethod) {
    const methodText = initMethod.getText();
    const modelNameMatch = methodText.match(/modelName:\s*["'](\w+)["']/);
    if (modelNameMatch) {
      modelName = modelNameMatch[1];
    }
  }

  const properties = modelClass.getProperties();
  for (const prop of properties) {
    const name = prop.getName();
    if (name.startsWith("_") || name === "sequelize") continue;

    const typeNode = prop.getTypeNode();
    let typeText = typeNode ? typeNode.getText() : "any";

    // Skip association properties - these are not database columns
    // They include Sequelize mixins, related model arrays, and model references
    const primitiveTypes = new Set([
      "string",
      "number",
      "boolean",
      "Date",
      "any",
      "object",
      "unknown",
      "null",
      "undefined",
      "bigint",
      "symbol",
    ]);
    const primitiveArrayTypes = new Set([
      "string[]",
      "number[]",
      "boolean[]",
      "Date[]",
      "any[]",
      "object[]",
    ]);
    // Check if it's a model class array (lowercase class name + []) but NOT a primitive array
    const isModelArray = /^[a-z]\w*\[\]$/.test(typeText) && !primitiveArrayTypes.has(typeText);
    if (
      typeText.includes("Mixin") ||
      typeText.includes("Sequelize.") ||
      isModelArray || // e.g., post[], user[] (but not string[], number[])
      (/^[a-z]\w*$/.test(typeText) && !primitiveTypes.has(typeText)) // e.g., user, post (lowercase model class references, but not primitives)
    ) {
      continue;
    }

    const hasQuestionToken = prop.hasQuestionToken();

    const nullable = typeText.includes("null");

    typeText = typeText.replace(/\s*\|\s*null/g, "").trim();

    attributes.push({
      name,
      type: typeText,
      optional: hasQuestionToken,
      nullable,
      hasDefault: false,
    });
  }

  if (initMethod) {
    const methodText = initMethod.getText();

    const attrBlockMatch = methodText.match(/\.init\s*\(\s*\{([\s\S]*?)\}\s*,\s*\{/);
    if (attrBlockMatch) {
      const attrBlock = attrBlockMatch[1];

      const attrRegex = /(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
      let attrMatch;

      // Known Sequelize configuration property names that are NOT model attributes
      const sequelizeConfigProps = new Set([
        "validate", "get", "set", "defaultValue", "references", "onDelete", "onUpdate",
        "unique", "primaryKey", "autoIncrement", "comment", "field", "args",
      ]);

      while ((attrMatch = attrRegex.exec(attrBlock)) !== null) {
        const attrName = attrMatch[1];
        const attrDef = attrMatch[2];

        // Skip known Sequelize config properties
        if (sequelizeConfigProps.has(attrName)) {
          continue;
        }

        // Skip nested config objects that aren't actual attributes (like validate, get, set)
        // Actual attributes will have a `type: DataTypes.X` definition
        if (!attrDef.includes("type:") && !attrDef.includes("DataTypes.")) {
          continue;
        }

        let existingAttr = attributes.find((a) => a.name === attrName);

        // If attribute doesn't exist in class properties, add it from init()
        if (!existingAttr) {
          // Infer type from DataTypes
          let inferredType = "any";
          if (attrDef.includes("DataTypes.UUID")) inferredType = "string";
          else if (attrDef.includes("DataTypes.STRING")) inferredType = "string";
          else if (attrDef.includes("DataTypes.TEXT")) inferredType = "string";
          else if (attrDef.includes("DataTypes.INTEGER")) inferredType = "number";
          else if (attrDef.includes("DataTypes.BIGINT")) inferredType = "number";
          else if (attrDef.includes("DataTypes.FLOAT")) inferredType = "number";
          else if (attrDef.includes("DataTypes.DOUBLE")) inferredType = "number";
          else if (attrDef.includes("DataTypes.DECIMAL")) inferredType = "number";
          else if (attrDef.includes("DataTypes.BOOLEAN")) inferredType = "boolean";
          else if (attrDef.includes("DataTypes.DATE")) inferredType = "Date";
          else if (attrDef.includes("DataTypes.JSON")) inferredType = "any";

          const allowNull = attrDef.includes("allowNull: true");
          const hasDefaultVal = attrDef.includes("defaultValue:");

          attributes.push({
            name: attrName,
            type: inferredType,
            optional: allowNull || hasDefaultVal,
            nullable: allowNull,
            hasDefault: hasDefaultVal,
          });

          existingAttr = attributes.find((a) => a.name === attrName);
        }

        if (attrDef.includes("DataTypes.ENUM")) {
          const enumValues = extractEnumValues(attrDef);
          if (enumValues && existingAttr) {
            existingAttr.type = enumValues.map((v) => `"${v}"`).join(" | ");
          }
        }

        const allowNullMatch = attrDef.match(/allowNull:\s*(true|false)/);
        if (allowNullMatch && existingAttr) {
          if (allowNullMatch[1] === "true") {
            existingAttr.nullable = true;
          }
        }

        // Mark attributes with defaultValue - they are optional for creation, not for reading
        const hasDefault = attrDef.includes("defaultValue:");
        if (existingAttr && hasDefault) {
          existingAttr.hasDefault = true;
        }
      }
    }
  }

  const associateMethod = modelClass.getMethod("associate");
  if (associateMethod) {
    const methodText = associateMethod.getText();

    const hasOneRegex = /\.hasOne\s*\(\s*models\.(\w+)\s*,\s*\{([^}]+)\}/g;
    let hasOneMatch;
    while ((hasOneMatch = hasOneRegex.exec(methodText)) !== null) {
      const targetModel = hasOneMatch[1];
      const options = hasOneMatch[2];
      const asMatch = options.match(/as:\s*["'](\w+)["']/);
      const fkMatch = options.match(/foreignKey:\s*["'](\w+)["']/);
      associations.push({
        type: "hasOne",
        targetModel,
        as: asMatch ? asMatch[1] : targetModel,
        foreignKey: fkMatch ? fkMatch[1] : "id",
      });
    }

    const hasManyRegex = /\.hasMany\s*\(\s*models\.(\w+)\s*,\s*\{([^}]+)\}/g;
    let hasManyMatch;
    while ((hasManyMatch = hasManyRegex.exec(methodText)) !== null) {
      const targetModel = hasManyMatch[1];
      const options = hasManyMatch[2];
      const asMatch = options.match(/as:\s*["'](\w+)["']/);
      const fkMatch = options.match(/foreignKey:\s*["'](\w+)["']/);
      associations.push({
        type: "hasMany",
        targetModel,
        as: asMatch ? asMatch[1] : targetModel,
        foreignKey: fkMatch ? fkMatch[1] : "id",
      });
    }

    const belongsToRegex = /\.belongsTo\s*\(\s*models\.(\w+)\s*,\s*\{([^}]+)\}/g;
    let belongsToMatch;
    while ((belongsToMatch = belongsToRegex.exec(methodText)) !== null) {
      const targetModel = belongsToMatch[1];
      const options = belongsToMatch[2];
      const asMatch = options.match(/as:\s*["'](\w+)["']/);
      const fkMatch = options.match(/foreignKey:\s*["'](\w+)["']/);
      associations.push({
        type: "belongsTo",
        targetModel,
        as: asMatch ? asMatch[1] : targetModel,
        foreignKey: fkMatch ? fkMatch[1] : `${targetModel}Id`,
      });
    }

    const belongsToManyRegex = /\.belongsToMany\s*\(\s*models\.(\w+)\s*,\s*\{([^}]+)\}/g;
    let belongsToManyMatch;
    while ((belongsToManyMatch = belongsToManyRegex.exec(methodText)) !== null) {
      const targetModel = belongsToManyMatch[1];
      const options = belongsToManyMatch[2];
      const asMatch = options.match(/as:\s*["'](\w+)["']/);
      const fkMatch = options.match(/foreignKey:\s*["'](\w+)["']/);
      associations.push({
        type: "belongsToMany",
        targetModel,
        as: asMatch ? asMatch[1] : targetModel,
        foreignKey: fkMatch ? fkMatch[1] : `${className}Id`,
      });
    }
  }

  // Extract exported type aliases from the model file
  const exportedTypes: ExportedType[] = [];
  const typeAliases = sourceFile.getTypeAliases();
  for (const typeAlias of typeAliases) {
    if (typeAlias.isExported()) {
      const name = typeAlias.getName();
      // Skip attributes/creation types that we generate
      if (
        name.toLowerCase().includes("attributes") ||
        name.toLowerCase().includes("creation")
      ) {
        continue;
      }
      const typeText = typeAlias.getType().getText(typeAlias);
      exportedTypes.push({
        name,
        definition: `type ${name} = ${typeText};`,
      });
    }
  }

  // Also extract exported interfaces
  const interfaces = sourceFile.getInterfaces();
  for (const iface of interfaces) {
    if (iface.isExported()) {
      const name = iface.getName();
      // Skip attributes/creation interfaces that we generate
      if (
        name.toLowerCase().includes("attributes") ||
        name.toLowerCase().includes("creation")
      ) {
        continue;
      }
      exportedTypes.push({
        name,
        definition: iface.getText(),
      });
    }
  }

  // Extract public instance methods (not static, not constructor, not initModel/associate)
  const instanceMethods: InstanceMethod[] = [];
  const methods = modelClass.getMethods();
  const excludedMethods = new Set(["initModel", "associate", "constructor"]);

  for (const method of methods) {
    const methodName = method.getName();

    // Skip static methods, excluded methods, and private/protected methods
    if (method.isStatic()) continue;
    if (excludedMethods.has(methodName)) continue;
    if (method.hasModifier(SyntaxKind.PrivateKeyword)) continue;
    if (method.hasModifier(SyntaxKind.ProtectedKeyword)) continue;

    // Get the method signature
    const params = method.getParameters();
    const paramSignatures = params.map(p => {
      const paramName = p.getName();
      const paramType = p.getTypeNode()?.getText() || "any";
      const isOptional = p.hasQuestionToken() || p.hasInitializer();
      return `${paramName}${isOptional ? "?" : ""}: ${paramType}`;
    });

    const returnTypeNode = method.getReturnTypeNode();
    const returnType = returnTypeNode?.getText() || "any";

    instanceMethods.push({
      name: methodName,
      signature: `(${paramSignatures.join(", ")}): ${returnType}`,
      returnType,
    });
  }

  // Extract getters as readonly properties
  const getAccessors = modelClass.getGetAccessors();
  for (const getter of getAccessors) {
    const getterName = getter.getName();
    if (getter.hasModifier(SyntaxKind.PrivateKeyword)) continue;
    if (getter.hasModifier(SyntaxKind.ProtectedKeyword)) continue;

    const returnTypeNode = getter.getReturnTypeNode();
    const returnType = returnTypeNode?.getText() || "any";

    // Add as a readonly property method signature (getter)
    instanceMethods.push({
      name: getterName,
      signature: `: ${returnType}`,
      returnType,
    });
  }

  project.removeSourceFile(sourceFile);

  return {
    className,
    modelName,
    attributes,
    associations,
    instanceMethods,
    filePath,
    exportedTypes,
  };
}

function parseExistingTypes(): Map<string, CustomType[]> {
  const customTypes = new Map<string, CustomType[]>();

  if (!fs.existsSync(OLD_TYPES_DIR)) {
    return customTypes;
  }

  const files = fs.readdirSync(OLD_TYPES_DIR).filter((f) => f.endsWith(".d.ts"));

  for (const file of files) {
    const filePath = path.join(OLD_TYPES_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const modelName = path.basename(file, ".d.ts");
    const types: CustomType[] = [];

    const interfaceRegex = /^interface\s+(\w+)(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\n\}/gm;
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      if (name.toLowerCase() === `${modelName}attributes`.toLowerCase()) continue;
      if (name.toLowerCase().includes("creation")) continue;

      types.push({
        name,
        definition: match[0],
        kind: "interface",
      });
    }

    // Parse type aliases - handle multi-line types with nested braces
    const typeStartRegex = /^type\s+(\w+)\s*=\s*/gm;
    while ((match = typeStartRegex.exec(content)) !== null) {
      const name = match[1];
      if (
        name.toLowerCase().includes("pk") ||
        name.toLowerCase().includes("id") ||
        name.toLowerCase().includes("optional") ||
        name.toLowerCase().includes("creation")
      ) {
        continue;
      }

      // Find the full type definition by counting braces
      const startIdx = match.index;
      let endIdx = match.index + match[0].length;
      let braceCount = 0;
      let inBraces = false;

      for (let i = endIdx; i < content.length; i++) {
        const char = content[i];
        if (char === "{") {
          braceCount++;
          inBraces = true;
        } else if (char === "}") {
          braceCount--;
        } else if (char === ";" && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }

      const definition = content.slice(startIdx, endIdx);
      types.push({
        name,
        definition,
        kind: "type",
      });
    }

    if (types.length > 0) {
      customTypes.set(modelName, types);
    }
  }

  return customTypes;
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert model class names in a type string to their Instance equivalents
 * e.g., "ecommerceOrderItem[]" -> "EcommerceOrderItemInstance[]"
 */
function convertModelTypesToInstance(typeStr: string, modelNames: Set<string>): string {
  let result = typeStr;
  for (const modelName of modelNames) {
    // Match the model name followed by array brackets or end of string/other chars
    const regex = new RegExp(`\\b${modelName}\\b(\\[\\])?`, 'g');
    const pascalName = toPascalCase(modelName);
    result = result.replace(regex, (_match, brackets) => {
      return `${pascalName}Instance${brackets || ''}`;
    });
  }
  return result;
}

function generateAssociationMethods(model: ModelInfo, _allModels: Map<string, ModelInfo>): string {
  const methodMap = new Map<string, string>(); // Use Map to avoid duplicate method names
  const propertyMap = new Map<string, string>(); // Association properties (for include results)

  const addMethod = (name: string, type: string) => {
    if (!methodMap.has(name)) {
      methodMap.set(name, `  ${name}: ${type};`);
    }
  };

  const addProperty = (name: string, type: string) => {
    if (!propertyMap.has(name)) {
      propertyMap.set(name, `  ${name}?: ${type};`);
    }
  };

  for (const assoc of model.associations) {
    const targetPascal = toPascalCase(assoc.targetModel);
    const asPascal = toPascalCase(assoc.as);

    switch (assoc.type) {
      case "hasOne":
        addMethod(`get${asPascal}`, `Sequelize.HasOneGetAssociationMixin<${targetPascal}Instance>`);
        addMethod(`set${asPascal}`, `Sequelize.HasOneSetAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`create${asPascal}`, `Sequelize.HasOneCreateAssociationMixin<${targetPascal}Instance>`);
        // Add property for when association is included
        addProperty(assoc.as, `${targetPascal}Instance`);
        break;

      case "hasMany":
        addMethod(`get${asPascal}`, `Sequelize.HasManyGetAssociationsMixin<${targetPascal}Instance>`);
        addMethod(`set${asPascal}`, `Sequelize.HasManySetAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`add${toPascalCase(assoc.targetModel)}`, `Sequelize.HasManyAddAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`add${asPascal}`, `Sequelize.HasManyAddAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`remove${toPascalCase(assoc.targetModel)}`, `Sequelize.HasManyRemoveAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`remove${asPascal}`, `Sequelize.HasManyRemoveAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`has${toPascalCase(assoc.targetModel)}`, `Sequelize.HasManyHasAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`has${asPascal}`, `Sequelize.HasManyHasAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`count${asPascal}`, `Sequelize.HasManyCountAssociationsMixin`);
        addMethod(`create${toPascalCase(assoc.targetModel)}`, `Sequelize.HasManyCreateAssociationMixin<${targetPascal}Instance>`);
        // Add property for when association is included (array for hasMany)
        addProperty(assoc.as, `${targetPascal}Instance[]`);
        break;

      case "belongsTo":
        addMethod(`get${asPascal}`, `Sequelize.BelongsToGetAssociationMixin<${targetPascal}Instance>`);
        addMethod(`set${asPascal}`, `Sequelize.BelongsToSetAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`create${asPascal}`, `Sequelize.BelongsToCreateAssociationMixin<${targetPascal}Instance>`);
        // Add property for when association is included
        addProperty(assoc.as, `${targetPascal}Instance`);
        break;

      case "belongsToMany":
        addMethod(`get${asPascal}`, `Sequelize.BelongsToManyGetAssociationsMixin<${targetPascal}Instance>`);
        addMethod(`set${asPascal}`, `Sequelize.BelongsToManySetAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`add${toPascalCase(assoc.targetModel)}`, `Sequelize.BelongsToManyAddAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`add${asPascal}`, `Sequelize.BelongsToManyAddAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`remove${toPascalCase(assoc.targetModel)}`, `Sequelize.BelongsToManyRemoveAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`remove${asPascal}`, `Sequelize.BelongsToManyRemoveAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`has${toPascalCase(assoc.targetModel)}`, `Sequelize.BelongsToManyHasAssociationMixin<${targetPascal}Instance, string>`);
        addMethod(`has${asPascal}`, `Sequelize.BelongsToManyHasAssociationsMixin<${targetPascal}Instance, string>`);
        addMethod(`count${asPascal}`, `Sequelize.BelongsToManyCountAssociationsMixin`);
        addMethod(`create${toPascalCase(assoc.targetModel)}`, `Sequelize.BelongsToManyCreateAssociationMixin<${targetPascal}Instance>`);
        // Add property for when association is included (array for belongsToMany)
        addProperty(assoc.as, `${targetPascal}Instance[]`);
        break;
    }
  }

  // Combine properties and methods
  const allMembers: string[] = [];

  // Add association properties first (these show up when using include)
  for (const prop of propertyMap.values()) {
    allMembers.push(prop);
  }

  // Add method mixins
  for (const method of methodMap.values()) {
    allMembers.push(method);
  }

  return allMembers.join("\n");
}

function generateTypesFile(models: ModelInfo[], customTypes: Map<string, CustomType[]>): string {
  const lines: string[] = [];
  const timestamp = new Date().toISOString();
  const hash = computeModelsHash();

  lines.push(`/**`);
  lines.push(` * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY`);
  lines.push(` * Generated: ${timestamp}`);
  lines.push(` * Hash: ${hash}`);
  lines.push(` * Models: ${models.length}`);
  lines.push(` *`);
  lines.push(` * Run 'pnpm types:generate' to regenerate this file.`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`/* eslint-disable @typescript-eslint/no-empty-interface */`);
  lines.push(``);
  lines.push(`import type { Model, ModelStatic, Optional } from "sequelize";`);
  lines.push(`import type * as Sequelize from "sequelize";`);
  lines.push(``);
  lines.push(`declare global {`);
  lines.push(``);

  const sortedModels = [...models].sort((a, b) =>
    a.modelName.localeCompare(b.modelName)
  );

  // Collect all exported types from model files
  const allExportedTypes = new Map<string, string>();
  for (const model of sortedModels) {
    for (const expType of model.exportedTypes) {
      if (!allExportedTypes.has(expType.name)) {
        allExportedTypes.set(expType.name, expType.definition);
      }
    }
  }

  // Output exported types first (before model definitions)
  if (allExportedTypes.size > 0) {
    lines.push(`  // ========================================`);
    lines.push(`  // Exported Types from Model Files`);
    lines.push(`  // ========================================`);
    lines.push(``);

    const sortedTypeNames = [...allExportedTypes.keys()].sort();
    for (const typeName of sortedTypeNames) {
      const def = allExportedTypes.get(typeName)!;
      // Indent the definition for global scope
      const indentedDef = def
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      lines.push(indentedDef);
      lines.push(``);
    }
  }

  const modelMap = new Map<string, ModelInfo>();
  const modelNames = new Set<string>();
  for (const model of sortedModels) {
    modelMap.set(model.modelName, model);
    modelNames.add(model.modelName);
  }

  for (const model of sortedModels) {
    const pascalName = toPascalCase(model.modelName);

    lines.push(`  // ========================================`);
    lines.push(`  // ${pascalName}`);
    lines.push(`  // ========================================`);
    lines.push(``);

    // Timestamp fields are auto-managed by Sequelize, so always make them optional
    const timestampFields = new Set(["createdAt", "updatedAt", "deletedAt"]);

    lines.push(`  interface ${pascalName}Attributes {`);
    for (const attr of model.attributes) {
      // Make timestamp fields optional since they're auto-managed by Sequelize
      const isTimestamp = timestampFields.has(attr.name);
      const optionalMarker = attr.optional || isTimestamp ? "?" : "";
      const nullableType = attr.nullable ? ` | null` : "";
      lines.push(`    ${attr.name}${optionalMarker}: ${attr.type}${nullableType};`);
    }
    lines.push(`  }`);
    lines.push(``);

    // For CreationAttributes: fields with defaultValue, nullable fields, timestamps, or 'id' (auto-generated) are optional
    const optionalAttrs = model.attributes
      .filter((a) => a.optional || a.nullable || a.hasDefault || a.name === "id" || timestampFields.has(a.name))
      .map((a) => `"${a.name}"`)
      .join(" | ");

    if (optionalAttrs) {
      lines.push(
        `  type ${pascalName}CreationAttributes = Optional<${pascalName}Attributes, ${optionalAttrs}>;`
      );
    } else {
      lines.push(`  type ${pascalName}CreationAttributes = ${pascalName}Attributes;`);
    }
    lines.push(``);

    lines.push(
      `  interface ${pascalName}Instance extends Model<${pascalName}Attributes, ${pascalName}CreationAttributes>, ${pascalName}Attributes {`
    );

    const assocMethods = generateAssociationMethods(model, modelMap);
    if (assocMethods) {
      // Indent association methods
      const indentedMethods = assocMethods.split('\n').map(line => `  ${line}`).join('\n');
      lines.push(indentedMethods);
    }

    // Add custom instance methods from the model class
    if (model.instanceMethods.length > 0) {
      lines.push(`    // Instance methods`);
      for (const method of model.instanceMethods) {
        // Convert model class names in return types to Instance types
        const convertedSignature = convertModelTypesToInstance(method.signature, modelNames);
        lines.push(`    ${method.name}${convertedSignature};`);
      }
    }

    lines.push(`  }`);
    lines.push(``);
  }

  lines.push(`  // ========================================`);
  lines.push(`  // Models Registry`);
  lines.push(`  // ========================================`);
  lines.push(``);
  lines.push(`  interface Models {`);
  lines.push(`    sequelize: Sequelize.Sequelize;`);
  for (const model of sortedModels) {
    const pascalName = toPascalCase(model.modelName);
    lines.push(`    ${model.modelName}: ModelStatic<${pascalName}Instance>;`);
  }
  lines.push(`  }`);
  lines.push(``);

  const allCustomTypes: CustomType[] = [];
  for (const [, types] of customTypes) {
    allCustomTypes.push(...types);
  }

  if (allCustomTypes.length > 0) {
    lines.push(`  // ========================================`);
    lines.push(`  // Custom Types (preserved from existing .d.ts files)`);
    lines.push(`  // ========================================`);
    lines.push(``);

    const seen = new Set<string>();
    for (const type of allCustomTypes) {
      if (!seen.has(type.name)) {
        seen.add(type.name);
        // Indent custom type definitions
        const indentedDef = type.definition.split('\n').map(line => `  ${line}`).join('\n');
        lines.push(indentedDef);
        lines.push(``);
      }
    }
  }

  lines.push(`  // ========================================`);
  lines.push(`  // Type Aliases (for backward compatibility)`);
  lines.push(`  // ========================================`);
  lines.push(``);
  for (const model of sortedModels) {
    const pascalName = toPascalCase(model.modelName);
    // Use original camelCase modelName for aliases (e.g., withdrawMethod -> withdrawMethodAttributes)
    lines.push(`  type ${model.modelName}Attributes = ${pascalName}Attributes;`);
    lines.push(`  type ${model.modelName}CreationAttributes = ${pascalName}CreationAttributes;`);
  }
  lines.push(``);

  // Generate plain object types for API responses (without Sequelize methods)
  lines.push(`  // ========================================`);
  lines.push(`  // Plain Types for API Responses`);
  lines.push(`  // These types represent the plain object form of models,`);
  lines.push(`  // useful for frontend consumption and API responses.`);
  lines.push(`  // ========================================`);
  lines.push(``);

  for (const model of sortedModels) {
    const pascalName = toPascalCase(model.modelName);

    // Generate the plain type with all association properties
    lines.push(`  /** Plain object type for ${pascalName}, suitable for API responses */`);
    lines.push(`  interface ${pascalName}Plain extends ${pascalName}Attributes {`);

    // Add association properties from the model's associations
    for (const assoc of model.associations) {
      const targetPascal = toPascalCase(assoc.targetModel);
      if (assoc.type === "hasMany" || assoc.type === "belongsToMany") {
        lines.push(`    ${assoc.as}?: ${targetPascal}Plain[];`);
      } else {
        lines.push(`    ${assoc.as}?: ${targetPascal}Plain;`);
      }
    }

    lines.push(`  }`);
    lines.push(``);
  }

  // Generate utility types for working with includes
  lines.push(`  // ========================================`);
  lines.push(`  // Utility Types for Includes`);
  lines.push(`  // ========================================`);
  lines.push(``);
  lines.push(`  /** Extract the plain type from a Sequelize instance */`);
  lines.push(`  type PlainOf<T> = T extends { get(options: { plain: true }): infer P } ? P : T;`);
  lines.push(``);
  lines.push(`  /** Make specific associations required instead of optional */`);
  lines.push(`  type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };`);
  lines.push(``);
  lines.push(`  /** Type for findAll results with includes */`);
  lines.push(`  type FindAllResult<T> = T[];`);
  lines.push(``);
  lines.push(`  /** Type for findOne result with includes */`);
  lines.push(`  type FindOneResult<T> = T | null;`);
  lines.push(``);

  lines.push(`}`);
  lines.push(``);
  lines.push(`export {};`);
  lines.push(``);

  return lines.join("\n");
}

function findModelFiles(dir: string): string[] {
  const files: string[] = [];

  function walkDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        entry.name !== "init.ts" &&
        !entry.name.includes("index")
      ) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dir);
  return files;
}

async function main() {
  console.log("Checking if type regeneration is needed...");

  const forceRegenerate = process.argv.includes("--force");

  if (!forceRegenerate && !needsRegeneration()) {
    console.log("Types are up to date (hash unchanged)");
    return;
  }

  console.log("Starting type generation...");

  // Ensure types directory exists
  const typesDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(typesDir)) {
    fs.mkdirSync(typesDir, { recursive: true });
  }

  const project = new Project({
    compilerOptions: {
      target: 99,
      module: 99,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
  });

  const modelFiles = findModelFiles(MODELS_DIR);
  console.log(`Found ${modelFiles.length} model files`);

  const models: ModelInfo[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const filePath of modelFiles) {
    try {
      const modelInfo = parseModelFile(project, filePath);
      if (modelInfo) {
        models.push(modelInfo);
        successCount++;
      }
    } catch (error) {
      errorCount++;
      const relativePath = path.relative(MODELS_DIR, filePath);
      console.error(`Error parsing ${relativePath}:`, error);
    }
  }

  console.log(`Parsed ${successCount} models`);
  if (errorCount > 0) {
    console.log(`${errorCount} models had parsing errors`);
  }

  const customTypes = parseExistingTypes();
  console.log(`Found ${customTypes.size} files with custom types`);

  const content = generateTypesFile(models, customTypes);

  fs.writeFileSync(OUTPUT_FILE, content, "utf-8");
  console.log(`Generated ${OUTPUT_FILE}`);

  storeHash();
  console.log(`Stored hash to ${HASH_FILE}`);

  console.log("Type generation complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
