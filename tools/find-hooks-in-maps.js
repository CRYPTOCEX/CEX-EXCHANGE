const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");

// Track all violations found
const violations = [];

// Check if function is inside a map, forEach, filter, or similar iteration method
function isFunctionInsideIteration(funcPath) {
  if (!funcPath) return false;
  
  let current = funcPath.parentPath;
  let iterationInfo = null;
  
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
              iterationInfo = {
                method: methodName,
                line: current.node.loc ? current.node.loc.start.line : 'unknown',
                column: current.node.loc ? current.node.loc.start.column : 'unknown'
              };
              return iterationInfo;
            }
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

async function analyzeFile(filePath) {
  try {
    const code = await fs.readFile(filePath, "utf8");
    let ast;
    
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch (error) {
      console.warn(`Failed to parse ${filePath}: ${error.message}`);
      return [];
    }

    const fileViolations = [];

    traverse(ast, {
      // Look for const t = useTranslations() declarations
      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id, { name: "t" }) &&
          t.isCallExpression(path.node.init) &&
          t.isIdentifier(path.node.init.callee, { name: "useTranslations" })
        ) {
          const funcPath = findEnclosingFunction(path);
          const iterationInfo = isFunctionInsideIteration(funcPath);
          
          if (iterationInfo) {
            fileViolations.push({
              type: 'const_t_in_iteration',
              file: filePath,
              line: path.node.loc ? path.node.loc.start.line : 'unknown',
              column: path.node.loc ? path.node.loc.start.column : 'unknown',
              iterationMethod: iterationInfo.method,
              iterationLine: iterationInfo.line,
              iterationColumn: iterationInfo.column,
              context: `const t = useTranslations() inside ${iterationInfo.method}()`
            });
          }
        }
      },

      // Look for direct useTranslations() calls
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee, { name: "useTranslations" })) {
          const funcPath = findEnclosingFunction(path);
          const iterationInfo = isFunctionInsideIteration(funcPath);
          
          if (iterationInfo) {
            fileViolations.push({
              type: 'useTranslations_call_in_iteration',
              file: filePath,
              line: path.node.loc ? path.node.loc.start.line : 'unknown',
              column: path.node.loc ? path.node.loc.start.column : 'unknown',
              iterationMethod: iterationInfo.method,
              iterationLine: iterationInfo.line,
              iterationColumn: iterationInfo.column,
              context: `useTranslations() call inside ${iterationInfo.method}()`
            });
          }
        }
      }
    });

    return fileViolations;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

async function main() {
  try {
    console.log("🔍 Scanning for React hooks violations in iteration methods...\n");

    // Find all TSX files in frontend
    const tsxFiles = await glob([
      "frontend/app/**/*.tsx",
      "frontend/components/**/*.tsx"
    ], {
      ignore: ["**/node_modules/**"]
    });

    console.log(`📁 Found ${tsxFiles.length} files to analyze\n`);

    let totalViolations = 0;
    const violationsByFile = {};

    // Analyze each file
    for (const filePath of tsxFiles) {
      const fileViolations = await analyzeFile(filePath);
      if (fileViolations.length > 0) {
        violationsByFile[filePath] = fileViolations;
        totalViolations += fileViolations.length;
      }
    }

    // Report results
    if (totalViolations === 0) {
      console.log("✅ No React hooks violations found in iteration methods!");
      return;
    }

    console.log(`❌ Found ${totalViolations} React hooks violations in ${Object.keys(violationsByFile).length} files:\n`);

    // Group violations by type
    const constTViolations = [];
    const useTranslationsViolations = [];

    Object.entries(violationsByFile).forEach(([filePath, violations]) => {
      violations.forEach(violation => {
        if (violation.type === 'const_t_in_iteration') {
          constTViolations.push(violation);
        } else {
          useTranslationsViolations.push(violation);
        }
      });
    });

    // Report const t violations
    if (constTViolations.length > 0) {
      console.log(`🚨 CONST T IN ITERATIONS (${constTViolations.length} violations):`);
      console.log("=" .repeat(60));
      constTViolations.forEach(violation => {
        console.log(`📄 ${violation.file}`);
        console.log(`   Line ${violation.line}:${violation.column} - ${violation.context}`);
        console.log(`   Inside ${violation.iterationMethod}() at line ${violation.iterationLine}:${violation.iterationColumn}`);
        console.log("");
      });
    }

    // Report useTranslations call violations
    if (useTranslationsViolations.length > 0) {
      console.log(`🚨 USETRANSLATIONS CALLS IN ITERATIONS (${useTranslationsViolations.length} violations):`);
      console.log("=" .repeat(60));
      useTranslationsViolations.forEach(violation => {
        console.log(`📄 ${violation.file}`);
        console.log(`   Line ${violation.line}:${violation.column} - ${violation.context}`);
        console.log(`   Inside ${violation.iterationMethod}() at line ${violation.iterationLine}:${violation.iterationColumn}`);
        console.log("");
      });
    }

    // Summary and recommendations
    console.log("🔧 RECOMMENDATIONS:");
    console.log("=" .repeat(60));
    console.log("1. Move 'const t = useTranslations()' to the component's top level");
    console.log("2. Remove duplicate useTranslations() calls inside iterations");
    console.log("3. Use the top-level 't' function inside map/forEach/filter functions");
    console.log("4. Ensure hooks are always called in the same order");
    console.log("");

    // Generate fix commands
    console.log("📋 FILES TO FIX:");
    console.log("=" .repeat(60));
    Object.keys(violationsByFile).forEach(filePath => {
      console.log(`- ${filePath}`);
    });

  } catch (error) {
    console.error("Error during analysis:", error);
    process.exit(1);
  }
}

// Run the tool
main(); 