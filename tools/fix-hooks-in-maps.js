const fs = require("fs/promises");
const path = require("path");
const glob = require("fast-glob");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;

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
              return {
                method: methodName,
                line: current.node.loc ? current.node.loc.start.line : 'unknown'
              };
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

// Check if there's already a top-level useTranslations declaration
function hasTopLevelUseTranslations(ast) {
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

// Find the position to insert top-level useTranslations
function findInsertPosition(ast) {
  let lastImportIndex = -1;
  let useClientIndex = -1;
  
  for (let i = 0; i < ast.program.body.length; i++) {
    const node = ast.program.body[i];
    
    if (t.isImportDeclaration(node)) {
      lastImportIndex = i;
    } else if (
      t.isExpressionStatement(node) &&
      t.isStringLiteral(node.expression) &&
      (node.expression.value === "use client" ||
        node.expression.value === "use server" ||
        node.expression.value === "use strict")
    ) {
      useClientIndex = i;
    }
  }
  
  // Insert after the last import or "use client" directive
  return Math.max(lastImportIndex, useClientIndex) + 1;
}

// Get namespace from file path (same logic as extract-translation.js)
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

async function fixFile(filePath) {
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
      return { fixed: false, error: error.message };
    }

    let hasViolations = false;
    let hasUseTranslationsImport = false;
    const violationsToRemove = [];
    
    // Check for existing useTranslations import
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
      }
    });

    // Find violations to fix
    traverse(ast, {
      // Look for const t = useTranslations() declarations inside iterations
      VariableDeclarator(path) {
        if (
          t.isIdentifier(path.node.id, { name: "t" }) &&
          t.isCallExpression(path.node.init) &&
          t.isIdentifier(path.node.init.callee, { name: "useTranslations" })
        ) {
          const funcPath = findEnclosingFunction(path);
          const iterationInfo = isFunctionInsideIteration(funcPath);
          
          if (iterationInfo) {
            hasViolations = true;
            violationsToRemove.push(path);
          }
        }
      }
    });

    if (!hasViolations) {
      return { fixed: false, reason: "No violations found" };
    }

    // Remove the violations (const t declarations inside iterations)
    violationsToRemove.forEach(path => {
      // If this is the only declaration in the variable declaration, remove the whole statement
      const varDeclaration = path.parentPath;
      if (varDeclaration.node.declarations.length === 1) {
        varDeclaration.remove();
      } else {
        // Otherwise just remove this declarator
        path.remove();
      }
    });

    // Add top-level useTranslations if not already present
    if (!hasTopLevelUseTranslations(ast)) {
      const namespace = getNamespaceFromFile(filePath);
      const insertPos = findInsertPosition(ast);
      
      // Create the const t = useTranslations() declaration
      const tDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("t"),
          t.callExpression(t.identifier("useTranslations"), [
            t.stringLiteral(namespace)
          ])
        )
      ]);

      // Insert at the calculated position
      ast.program.body.splice(insertPos, 0, tDeclaration);
    }

    // Add useTranslations import if not present
    if (!hasUseTranslationsImport) {
      const importDeclaration = t.importDeclaration(
        [t.importSpecifier(t.identifier("useTranslations"), t.identifier("useTranslations"))],
        t.stringLiteral("next-intl")
      );
      
      // Find position after "use client" or at the beginning
      let importInsertPos = 0;
      for (let i = 0; i < ast.program.body.length; i++) {
        const node = ast.program.body[i];
        if (
          t.isExpressionStatement(node) &&
          t.isStringLiteral(node.expression) &&
          node.expression.value === "use client"
        ) {
          importInsertPos = i + 1;
          break;
        }
      }
      
      ast.program.body.splice(importInsertPos, 0, importDeclaration);
    }

    // Generate the fixed code
    const fixedCode = generate(ast, {
      retainLines: false,
      compact: false
    }).code;

    // Write the fixed code back to the file
    await fs.writeFile(filePath, fixedCode, "utf8");

    return { 
      fixed: true, 
      violationsRemoved: violationsToRemove.length,
      addedTopLevelT: !hasTopLevelUseTranslations(ast),
      addedImport: !hasUseTranslationsImport
    };

  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return { fixed: false, error: error.message };
  }
}

async function main() {
  try {
    console.log("🔧 Starting automated fix for React hooks violations in iterations...\n");

    // Get list of files to fix from command line args or scan all
    let filesToFix = [];
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
      // Specific files provided
      filesToFix = args;
      console.log(`📁 Fixing ${filesToFix.length} specified files...\n`);
    } else {
      // Scan all TSX files
      const tsxFiles = await glob([
        "frontend/app/**/*.tsx",
        "frontend/components/**/*.tsx"
      ], {
        ignore: ["**/node_modules/**"]
      });
      
      console.log(`📁 Scanning ${tsxFiles.length} files for violations...\n`);
      
      // Only include files that actually have violations
      for (const filePath of tsxFiles) {
        try {
          const code = await fs.readFile(filePath, "utf8");
          const ast = parse(code, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
          });
          
          let hasViolations = false;
          traverse(ast, {
            VariableDeclarator(path) {
              if (
                t.isIdentifier(path.node.id, { name: "t" }) &&
                t.isCallExpression(path.node.init) &&
                t.isIdentifier(path.node.init.callee, { name: "useTranslations" })
              ) {
                const funcPath = findEnclosingFunction(path);
                if (isFunctionInsideIteration(funcPath)) {
                  hasViolations = true;
                  path.stop(); // Stop traversing once we find a violation
                }
              }
            }
          });
          
          if (hasViolations) {
            filesToFix.push(filePath);
          }
        } catch (error) {
          // Skip files that can't be parsed
          continue;
        }
      }
      
      console.log(`🎯 Found ${filesToFix.length} files with violations to fix\n`);
    }

    if (filesToFix.length === 0) {
      console.log("✅ No files with violations found!");
      return;
    }

    let fixedCount = 0;
    let errorCount = 0;
    const results = [];

    // Fix each file
    for (const filePath of filesToFix) {
      console.log(`🔧 Fixing: ${filePath}`);
      const result = await fixFile(filePath);
      
      if (result.fixed) {
        fixedCount++;
        console.log(`   ✅ Fixed - Removed ${result.violationsRemoved} violations`);
        if (result.addedTopLevelT) console.log(`   📝 Added top-level const t`);
        if (result.addedImport) console.log(`   📦 Added useTranslations import`);
      } else {
        errorCount++;
        if (result.reason) {
          console.log(`   ⏭️  Skipped - ${result.reason}`);
        } else {
          console.log(`   ❌ Error - ${result.error}`);
        }
      }
      
      results.push({ file: filePath, ...result });
      console.log("");
    }

    // Summary
    console.log("📊 SUMMARY:");
    console.log("=" .repeat(50));
    console.log(`✅ Files fixed: ${fixedCount}`);
    console.log(`❌ Files with errors: ${errorCount}`);
    console.log(`📁 Total files processed: ${filesToFix.length}`);
    
    if (fixedCount > 0) {
      console.log("\n🎉 Fixes applied successfully!");
      console.log("💡 Remember to test your application to ensure everything works correctly.");
    }

  } catch (error) {
    console.error("Error during automated fix:", error);
    process.exit(1);
  }
}

// Run the tool
main(); 