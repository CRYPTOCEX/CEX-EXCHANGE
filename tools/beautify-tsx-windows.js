#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Prettier configuration
const prettierConfig = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  parser: 'typescript'
};

class WindowsTSXBeautifier {
  constructor() {
    this.processedFiles = 0;
    this.errorFiles = 0;
    this.skippedFiles = 0;
    this.startTime = Date.now();
  }

  log(message, color = colors.white) {
    console.log(`${color}${message}${colors.reset}`);
  }

  logSuccess(message) {
    this.log(`✓ ${message}`, colors.green);
  }

  logError(message) {
    this.log(`✗ ${message}`, colors.red);
  }

  logWarning(message) {
    this.log(`⚠ ${message}`, colors.yellow);
  }

  logInfo(message) {
    this.log(`ℹ ${message}`, colors.blue);
  }

  logHeader(message) {
    this.log(`\n${colors.bright}${colors.cyan}${message}${colors.reset}`);
  }

  // Check if Prettier is installed
  async checkPrettierInstallation() {
    return new Promise((resolve) => {
      const child = spawn('npx', ['prettier', '--version'], { 
        stdio: 'pipe',
        shell: true 
      });
      
      child.on('close', (code) => {
        resolve(code === 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  // Install Prettier if not available
  async installPrettier() {
    this.logInfo('Installing Prettier...');
    return new Promise((resolve) => {
      const child = spawn('npm', ['install', '--save-dev', 'prettier'], { 
        stdio: 'inherit',
        shell: true 
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          this.logSuccess('Prettier installed successfully');
          resolve(true);
        } else {
          this.logError('Failed to install Prettier');
          resolve(false);
        }
      });
      
      child.on('error', (error) => {
        this.logError(`Failed to install Prettier: ${error.message}`);
        resolve(false);
      });
    });
  }

  // Find all TSX files recursively
  findTSXFiles(dir, excludeDirs = ['node_modules', '.git', '.next', 'dist', 'build']) {
    let tsxFiles = [];
    
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!excludeDirs.includes(item)) {
            tsxFiles = tsxFiles.concat(this.findTSXFiles(fullPath, excludeDirs));
          }
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          tsxFiles.push(fullPath);
        }
      }
    } catch (error) {
      this.logError(`Error reading directory ${dir}: ${error.message}`);
    }
    
    return tsxFiles;
  }

  // Create prettier config file
  createPrettierConfig() {
    const configPath = path.join(process.cwd(), '.prettierrc');
    
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(prettierConfig, null, 2));
      this.logSuccess('Created .prettierrc configuration file');
    } else {
      this.logInfo('Using existing .prettierrc configuration');
    }
  }

  // Create prettier ignore file
  createPrettierIgnore() {
    const ignorePath = path.join(process.cwd(), '.prettierignore');
    const ignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
.next/
out/
build/
dist/

# Environment files
.env*

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt

# Gatsby files
.cache/
public

# Storybook build outputs
.out
.storybook-out

# Temporary folders
tmp/
temp/

# Editor directories and files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Package manager files
package-lock.json
yarn.lock
pnpm-lock.yaml
`;

    if (!fs.existsSync(ignorePath)) {
      fs.writeFileSync(ignorePath, ignoreContent);
      this.logSuccess('Created .prettierignore file');
    } else {
      this.logInfo('Using existing .prettierignore file');
    }
  }

  // Format a single file using spawn instead of execSync
  async formatFile(filePath) {
    return new Promise((resolve) => {
      try {
        // Read original file
        const originalContent = fs.readFileSync(filePath, 'utf8');
        
        // Use spawn with proper shell handling for Windows
        const child = spawn('npx', ['prettier', '--write', filePath], {
          stdio: 'pipe',
          shell: true,
          cwd: process.cwd()
        });
        
        let stderr = '';
        
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            try {
              // Read formatted file to check if it changed
              const formattedContent = fs.readFileSync(filePath, 'utf8');
              
              if (originalContent !== formattedContent) {
                this.logSuccess(`Formatted: ${path.relative(process.cwd(), filePath)}`);
                this.processedFiles++;
              } else {
                this.skippedFiles++;
              }
              resolve(true);
            } catch (error) {
              this.logError(`Failed to read formatted file ${path.relative(process.cwd(), filePath)}: ${error.message}`);
              this.errorFiles++;
              resolve(false);
            }
          } else {
            this.logError(`Failed to format ${path.relative(process.cwd(), filePath)}: ${stderr || 'Unknown error'}`);
            this.errorFiles++;
            resolve(false);
          }
        });
        
        child.on('error', (error) => {
          this.logError(`Failed to format ${path.relative(process.cwd(), filePath)}: ${error.message}`);
          this.errorFiles++;
          resolve(false);
        });
        
      } catch (error) {
        this.logError(`Failed to read ${path.relative(process.cwd(), filePath)}: ${error.message}`);
        this.errorFiles++;
        resolve(false);
      }
    });
  }

  // Format files in batches to avoid overwhelming the system
  async formatFilesBatch(files, batchSize = 5) {
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      // Process batch in parallel
      const promises = batch.map(file => this.formatFile(file));
      await Promise.all(promises);
      
      // Show progress
      const progress = Math.min(i + batchSize, files.length);
      const percentage = ((progress / files.length) * 100).toFixed(1);
      process.stdout.write(`\r${colors.blue}Progress: ${progress}/${files.length} files (${percentage}%)${colors.reset}`);
      
      // Small delay to prevent overwhelming the system
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    console.log(); // New line after progress
  }

  // Main beautify function
  async beautify(targetDir = '.', options = {}) {
    this.logHeader('🎨 Windows TSX/TS File Beautifier');
    
    // Check if Prettier is installed
    const prettierAvailable = await this.checkPrettierInstallation();
    if (!prettierAvailable) {
      this.logWarning('Prettier not found. Installing...');
      const installed = await this.installPrettier();
      if (!installed) {
        this.logError('Cannot proceed without Prettier');
        process.exit(1);
      }
    } else {
      this.logSuccess('Prettier is available');
    }

    // Create configuration files
    this.createPrettierConfig();
    this.createPrettierIgnore();

    // Find all TSX/TS files
    this.logInfo(`Scanning for TSX/TS files in: ${path.resolve(targetDir)}`);
    const tsxFiles = this.findTSXFiles(targetDir);
    
    if (tsxFiles.length === 0) {
      this.logWarning('No TSX/TS files found');
      return;
    }

    this.logInfo(`Found ${tsxFiles.length} TSX/TS files`);

    // Ask for confirmation if not in auto mode
    if (!options.auto) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question(`\n${colors.yellow}Do you want to format all ${tsxFiles.length} files? (y/N): ${colors.reset}`, resolve);
      });
      
      rl.close();

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        this.logInfo('Operation cancelled');
        return;
      }
    }

    // Format files
    this.logHeader('Formatting files...');
    await this.formatFilesBatch(tsxFiles, options.batchSize || 5);

    // Show summary
    this.showSummary();
  }

  // Show summary of operations
  showSummary() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);
    
    this.logHeader('📊 Summary');
    this.logSuccess(`Files formatted: ${this.processedFiles}`);
    this.logInfo(`Files unchanged: ${this.skippedFiles}`);
    
    if (this.errorFiles > 0) {
      this.logError(`Files with errors: ${this.errorFiles}`);
    }
    
    this.logInfo(`Total time: ${duration}s`);
    
    if (this.processedFiles > 0) {
      this.logSuccess('✨ All files have been beautified!');
    } else if (this.errorFiles === 0) {
      this.logSuccess('✨ All files were already properly formatted!');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    auto: args.includes('--auto') || args.includes('-y'),
    batchSize: 5
  };

  // Parse batch size
  const batchIndex = args.findIndex(arg => arg.startsWith('--batch-size='));
  if (batchIndex !== -1) {
    const batchSize = parseInt(args[batchIndex].split('=')[1]);
    if (!isNaN(batchSize) && batchSize > 0) {
      options.batchSize = batchSize;
    }
  }

  // Get target directory
  const targetDir = args.find(arg => !arg.startsWith('-')) || '.';

  const beautifier = new WindowsTSXBeautifier();
  
  try {
    await beautifier.beautify(targetDir, options);
  } catch (error) {
    beautifier.logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Help function
function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}Windows TSX/TS File Beautifier${colors.reset}

${colors.bright}Usage:${colors.reset}
  node tools/beautify-tsx-windows.js [directory] [options]

${colors.bright}Arguments:${colors.reset}
  directory              Target directory to scan (default: current directory)

${colors.bright}Options:${colors.reset}
  --auto, -y            Skip confirmation prompt
  --batch-size=N        Process N files at a time (default: 5)
  --help, -h            Show this help message

${colors.bright}Examples:${colors.reset}
  node tools/beautify-tsx-windows.js                    # Format all TSX/TS files in current directory
  node tools/beautify-tsx-windows.js frontend --auto    # Auto-format all files in frontend directory
  node tools/beautify-tsx-windows.js --batch-size=10    # Process 10 files at a time

${colors.bright}Features:${colors.reset}
  • Windows-compatible file path handling
  • Automatically installs Prettier if not available
  • Creates .prettierrc and .prettierignore files
  • Formats TypeScript and TSX files
  • Shows progress and detailed summary
  • Batch processing to avoid system overload
  • Handles special characters in file paths
`);
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the tool
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = WindowsTSXBeautifier; 