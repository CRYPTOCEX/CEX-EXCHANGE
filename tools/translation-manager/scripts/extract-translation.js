require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;

// Parse command line arguments
const args = process.argv.slice(2);
let fileLimit = null;
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  fileLimit = parseInt(args[limitIndex + 1], 10);
  if (isNaN(fileLimit) || fileLimit < 1) {
    console.error('Invalid --limit value. Please provide a positive number.');
    process.exit(1);
  }
}

const singleFile = null;

// Handle multi-line environment variable with proper parsing
const languagesString = process.env.NEXT_PUBLIC_LANGUAGES || "";
const locales = languagesString
  ? languagesString
      .split(/[,\n\r]+/) // Split by comma, newline, or carriage return
      .map((l) => l.trim()) // Remove whitespace
      .filter((l) => l.length > 0) // Remove empty strings
  : ["en"];

const messagesDir = path.join(process.cwd(), "frontend", "messages");

async function ensureMessageFiles() {
  await fs.mkdir(messagesDir, { recursive: true });
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, "{}", "utf8");
    }
  }
}

async function loadMessages() {
  const res = {};
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    const content = await fs.readFile(filePath, "utf8");
    res[locale] = JSON.parse(content);
  }
  return res;
}

async function saveMessages(messages) {
  for (const locale of locales) {
    const filePath = path.join(messagesDir, `${locale}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(messages[locale], null, 2),
      "utf8"
    );
  }
}

function getNamespaceFromFile(filePath) {
  const appDir = "frontend/app/";
  let rel;
  if (filePath.startsWith(appDir)) {
    rel = filePath.slice(appDir.length);
  } else {
    rel = filePath.replace(/^frontend\//, "");
  }

  rel = rel.replace(/\/(page|layout)\.tsx$/, "");
  rel = rel.replace(/\.tsx$/, "");

  let segments = rel.split("/").filter(Boolean);
  if (segments[0] && segments[0].startsWith("[") && segments[0].endsWith("]")) {
    segments.shift();
  }

  const finalSegments = [];
  for (const seg of segments) {
    if (seg.startsWith("(") && seg.endsWith(")")) {
      finalSegments.push(seg.slice(1, -1));
      break;
    } else {
      finalSegments.push(seg);
    }
  }

  const namespace = finalSegments.join("/") || "admin";
  return namespace;
}

// Check if text is wrapped by t()
function alreadyWrapped(path) {
  const parent = path.parent;
  return (
    t.isJSXExpressionContainer(parent) &&
    t.isCallExpression(parent.expression) &&
    t.isIdentifier(parent.expression.callee, { name: "t" })
  );
}

// Skip punctuation
const skipList = ["+", "-", "=", ":", ";", "…", "%", ">", "<", "!", "?"];
function shouldTranslate(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length === 1 && skipList.includes(trimmed)) return false;
  return true;
}

// Check sr-only ancestor
function isInsideSrOnly(path) {
  let current = path;
  while (current && !current.isProgram()) {
    if (current.isJSXElement()) {
      const opening = current.node.openingElement;
      for (const attr of opening.attributes) {
        if (t.isJSXAttribute(attr) && attr.name.name === "className") {
          if (t.isStringLiteral(attr.value)) {
            if (attr.value.value.includes("sr-only")) return true;
          } else if (
            t.isJSXExpressionContainer(attr.value) &&
            t.isStringLiteral(attr.value.expression) &&
            attr.value.expression.value.includes("sr-only")
          ) {
            return true;
          }
        }
      }
    }
    current = current.parentPath;
  }
  return false;
}

// Find enclosing function
function findEnclosingFunction(path) {
  let current = path;
  while (current && !current.isProgram()) {
    if (
      current.isFunctionDeclaration() ||
      current.isArrowFunctionExpression() ||
      current.isFunctionExpression()
    ) {
      return current;
    }
    current = current.parentPath;
  }
  return null;
}

// Check if function is inside a map, forEach, filter, or similar iteration method
function isFunctionInsideIteration(funcPath) {
  if (!funcPath) return false;
  
  let current = funcPath.parentPath;
  while (current && !current.isProgram()) {
    // Check if this is a call expression like array.map(), array.forEach(), etc.
    if (current.isCallExpression()) {
      const callee = current.node.callee;
      
      // Check for method calls like array.map(func)
      if (t.isMemberExpression(callee)) {
        const methodName = callee.property.name;
        const iterationMethods = ['map', 'forEach', 'filter', 'reduce', 'find', 'findIndex', 'some', 'every'];
        
        if (iterationMethods.includes(methodName)) {
          // Check if our function is one of the arguments to this method
          const args = current.node.arguments;
          for (const arg of args) {
            if (arg === funcPath.node) {
              return true;
            }
          }
        }
      }
    }
    current = current.parentPath;
  }
  return false;
}

function findLastImportOrUseClientNode(ast) {
  let lastNode = null;
  for (const node of ast.program.body) {
    if (t.isImportDeclaration(node)) {
      lastNode = node;
    } else if (
      t.isExpressionStatement(node) &&
      t.isStringLiteral(node.expression) &&
      (node.expression.value === "use client" ||
        node.expression.value === "use server" ||
        node.expression.value === "use strict")
    ) {
      lastNode = node;
    } else {
      break;
    }
  }
  return lastNode;
}

// Add new function to check for existing t declaration
function hasExistingTDeclaration(ast) {
  for (const node of ast.program.body) {
    if (
      t.isVariableDeclaration(node) &&
      node.declarations.some(
        (decl) =>
          t.isIdentifier(decl.id, { name: "t" }) &&
          t.isCallExpression(decl.init) &&
          t.isIdentifier(decl.init.callee, { name: "useTranslations" })
      )
    ) {
      return true;
    }
  }
  return false;
}

// Generate a readable key from text, preserving readability and casing
function generateTranslationKey(text) {
  // Clean up the text but keep it readable and preserve casing
  let key = text
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
  
  // Remove or replace problematic characters for JSON keys
  key = key
    .replace(/['"]/g, "") // remove quotes
    .replace(/[{}[\]]/g, "") // remove brackets
    .replace(/[\\\/]/g, "_") // replace slashes with underscores
    .replace(/\./g, "_") // replace periods with underscores
    .replace(/\n/g, " ") // replace newlines with space
    .trim();
    
  // If the key is too long (>50 chars), create a shorter version
  if (key.length > 50) {
    const words = key.split(" ");
    if (words.length > 1) {
      // Take first and last few words
      const firstWords = words.slice(0, 3).join(" ");
      const lastWords = words.slice(-2).join(" ");
      key = `${firstWords}_${lastWords}`;
    } else {
      // Single long word, truncate
      key = key.substring(0, 47) + "_";
    }
  }
  
  return key;
}

// Given a text string, split by '.' and generate multiple sentences
// Return {sentences: [..], endsWithPeriod: bool}
function splitIntoSentences(value) {
  const endsWithPeriod = value.endsWith(".");
  // Remove trailing '.' before splitting so we don't get empty last sentence
  let tempVal = endsWithPeriod ? value.slice(0, -1) : value;
  let sentences = tempVal
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  return { sentences, endsWithPeriod };
}

// Convert arrow function with expression body to block statement
function convertArrowFunctionToBlock(funcPath) {
  if (
    t.isArrowFunctionExpression(funcPath.node) &&
    !t.isBlockStatement(funcPath.node.body)
  ) {
    const returnStatement = t.returnStatement(funcPath.node.body);
    const blockStatement = t.blockStatement([returnStatement]);
    funcPath.node.body = blockStatement;
    return true;
  }
  return false;
}

async function processFile(filePath, messages) {
  const code = await fs.readFile(filePath, "utf8");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch (error) {
    console.warn(`Failed to parse ${filePath}: ${error.message}`);
    return { newKeysCount: 0, wasModified: false };
  }

  const namespace = getNamespaceFromFile(filePath);

  let hasUseTranslationsImport = false;
  const textNodes = [];
  let newKeysCount = 0;
  const arrowFunctionsConverted = [];

  traverse(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === "next-intl") {
        for (const spec of path.node.specifiers) {
          if (
            t.isImportSpecifier(spec) &&
            spec.imported.name === "useTranslations"
          ) {
            hasUseTranslationsImport = true;
          }
        }
      }
    },
    JSXText(path) {
      const original = path.node.value;
      if (!original.trim()) return;
      if (!shouldTranslate(original)) return;
      if (alreadyWrapped(path)) return;
      if (isInsideSrOnly(path)) return;

      textNodes.push(path);
    },
  });

  if (textNodes.length === 0) return { newKeysCount: 0, wasModified: false };

  const modifications = [];
  const funcsNeedingT = new Set();

  // First, handle arrow functions that need conversion
  for (const txtPath of textNodes) {
    const funcPath = findEnclosingFunction(txtPath);
    if (funcPath && t.isArrowFunctionExpression(funcPath.node) && !t.isBlockStatement(funcPath.node.body)) {
      if (convertArrowFunctionToBlock(funcPath)) {
        arrowFunctionsConverted.push(funcPath);
        console.log(`Converted arrow function to block statement in: ${filePath}`);
      }
    }
  }

  for (const txtPath of textNodes) {
    let originalVal = txtPath.node.value;
    // Clean and split into sentences by '.'
    originalVal = originalVal.replace(/\s+/g, " ").trim();
    const { sentences, endsWithPeriod } = splitIntoSentences(originalVal);

    // Generate multiple keys and t() calls
    const tCalls = [];
    const sentenceKeys = [];
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      // Create readable key from sentence - make sure to clean it properly
      let key = generateTranslationKey(sentence);
      
      // Double-check that no periods remain in the key
      key = key.replace(/\./g, "_");
      
      // Ensure key uniqueness in this namespace
      // Check if key already exists with same value - if so, reuse it
      let finalKey = key;
      if (messages[locales[0]][namespace] && messages[locales[0]][namespace][finalKey]) {
        // Key exists, check if it has the same value
        if (messages[locales[0]][namespace][finalKey] === sentence) {
          // Same value, reuse the existing key
          console.log(`Reusing existing key: ${namespace}.${finalKey} for "${sentence}"`);
        } else {
          // Different value, create a more descriptive key by adding context
          // Try to make the key more unique by adding more context from the sentence
          const words = sentence.split(' ');
          let uniqueKey = key;
          
          // Add more words from the sentence to make it unique
          if (words.length > 1) {
            // Take first 2-3 words and last 1-2 words
            const startWords = words.slice(0, Math.min(3, words.length));
            const endWords = words.slice(-Math.min(2, words.length));
            const combinedWords = [...new Set([...startWords, ...endWords])];
            uniqueKey = generateTranslationKey(combinedWords.join(' '));
          }
          
          // If still conflicts, add minimal context
          let counter = 1;
          finalKey = uniqueKey;
          while (messages[locales[0]][namespace] && messages[locales[0]][namespace][finalKey] && 
                 messages[locales[0]][namespace][finalKey] !== sentence) {
            // Only add counter if we really need to, and keep it minimal
            finalKey = `${uniqueKey}_${counter}`;
            counter++;
            // Prevent infinite loops
            if (counter > 100) {
              console.warn(`Too many conflicts for key: ${uniqueKey}, using random suffix`);
              finalKey = `${uniqueKey}_${Date.now()}`;
              break;
            }
          }
        }
      }
      
      // Add message
      for (const locale of locales) {
        if (!messages[locale][namespace]) messages[locale][namespace] = {};
        if (!messages[locale][namespace][finalKey]) {
          messages[locale][namespace][finalKey] = sentence;
          newKeysCount++;
        }
      }
      sentenceKeys.push(finalKey);
    }

    // Reconstruct the text with multiple t calls
    // "{t("key1")}. {t("key2")}" etc.
    let replacement = "";
    for (let i = 0; i < sentenceKeys.length; i++) {
      replacement += `{t("${sentenceKeys[i]}")}`;
      // Add period and space after each sentence except maybe last
      if (i < sentenceKeys.length - 1 || endsWithPeriod) {
        replacement += ".";
      }
      if (i < sentenceKeys.length - 1) {
        replacement += " ";
      }
    }

    // Replace the entire text node with this reconstructed string
    modifications.push({
      type: "replace",
      start: txtPath.node.start,
      end: txtPath.node.end,
      text: replacement,
      originalValue: originalVal,
    });

    const funcPath = findEnclosingFunction(txtPath);
    if (funcPath && !isFunctionInsideIteration(funcPath)) {
      funcsNeedingT.add(funcPath);
    }
  }

  // Check if we have any functions that need t but are inside iterations
  let hasIterationFunctions = false;
  for (const txtPath of textNodes) {
    const funcPath = findEnclosingFunction(txtPath);
    if (funcPath && isFunctionInsideIteration(funcPath)) {
      hasIterationFunctions = true;
      break;
    }
  }
  
  let needsTopLevelT = funcsNeedingT.size === 0 || hasIterationFunctions;

  // If we converted arrow functions, regenerate the code first
  if (arrowFunctionsConverted.length > 0) {
    const newCodeFromAst = generate(ast).code;
    await fs.writeFile(filePath, newCodeFromAst, "utf8");
    // Re-read the updated code for further modifications
    const updatedCode = await fs.readFile(filePath, "utf8");
    code = updatedCode;
  }

  const lastNode = findLastImportOrUseClientNode(ast);
  const tLine = `const t = useTranslations("${namespace}");`;

  function insertAtNodeEnd(...lines) {
    // Insert lines after lastNode or at start of file
    let pos = lastNode ? lastNode.end : 0;
    // Always start with a newline to ensure a clean line
    let textToInsert = "\n" + lines.join("\n") + "\n";
    modifications.push({
      type: "insert",
      index: pos,
      text: textToInsert,
    });
  }

  if (!hasUseTranslationsImport || needsTopLevelT) {
    const insertLines = [];
    if (!hasUseTranslationsImport) {
      insertLines.push('import { useTranslations } from "next-intl";');
    }
    if (needsTopLevelT && !hasExistingTDeclaration(ast)) {
      insertLines.push(tLine);
    }
    insertAtNodeEnd(...insertLines);
  }

  if (!needsTopLevelT) {
    for (const funcPath of funcsNeedingT) {
      const bodyStart = funcPath.node.body.start;
      const codeChars = code.split("");
      let bracePos = bodyStart;
      while (bracePos < code.length && codeChars[bracePos] !== "{") {
        bracePos++;
      }
      bracePos++;
      // Check if t is already declared in this function
      const hasTInFunction = funcPath.node.body.body.some(
        (stmt) =>
          t.isVariableDeclaration(stmt) &&
          stmt.declarations.some(
            (decl) =>
              t.isIdentifier(decl.id, { name: "t" }) &&
              t.isCallExpression(decl.init) &&
              t.isIdentifier(decl.init.callee, { name: "useTranslations" })
          )
      );
      if (!hasTInFunction) {
        modifications.push({
          type: "insert",
          index: bracePos,
          text: "\n  " + tLine,
        });
      }
    }
  }

  modifications.sort((a, b) => {
    const aPos = a.type === "insert" ? a.index : a.start;
    const bPos = b.type === "insert" ? b.index : b.start;
    return bPos - aPos;
  });

  let newCode = code;
  for (const mod of modifications) {
    if (mod.type === "insert") {
      const before = newCode.slice(0, mod.index);
      const after = newCode.slice(mod.index);
      newCode = before + mod.text + after;
    } else if (mod.type === "replace") {
      const before = newCode.slice(0, mod.start);
      const after = newCode.slice(mod.end);
      newCode = before + mod.text + after;
    }
  }

  if (modifications.length > 0) {
    await fs.writeFile(filePath, newCode, "utf8");
  }

  return { newKeysCount, wasModified: modifications.length > 0 };
}

(async function main() {
  try {
    await ensureMessageFiles();
    const messages = await loadMessages();

    let tsxFiles;
    if (singleFile) {
      tsxFiles = [singleFile];
    } else {
      // Only process app and components folders
      tsxFiles = await glob([
        "frontend/app/**/*.tsx",
        "frontend/components/**/*.tsx"
      ], {
        ignore: ["**/node_modules/**"] // Explicitly ignore node_modules
      });
    }

    console.log(`Processing ${tsxFiles.length} files...`);
    let totalNewKeys = 0;
    const modifiedFiles = [];

    // Apply file limit if specified
    if (fileLimit !== null && fileLimit < tsxFiles.length) {
      console.log(`Limiting processing to ${fileLimit} files as specified by --limit`);
      tsxFiles = tsxFiles.slice(0, fileLimit);
    }

    for (const filePath of tsxFiles) {
      try {
        const { newKeysCount, wasModified } = await processFile(filePath, messages);
        totalNewKeys += newKeysCount;
        if (wasModified) {
          modifiedFiles.push(filePath);
          console.log(`Processed ${filePath}: ${newKeysCount} new keys`);
        }
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
      }
    }

    await saveMessages(messages);
    console.log(`Total new translation keys added: ${totalNewKeys}`);
    console.log(`Modified files: ${modifiedFiles.length}`);
  } catch (err) {
    console.error("Error during translation extraction:", err);
  }
})();
