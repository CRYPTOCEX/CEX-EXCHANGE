# PowerShell script to beautify TSX/TS files using Prettier
param(
    [string]$Directory = "frontend",
    [switch]$Auto,
    [int]$BatchSize = 5
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" "Blue"
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-ColorOutput $Message "Cyan"
}

# Initialize counters
$ProcessedFiles = 0
$ErrorFiles = 0
$SkippedFiles = 0
$StartTime = Get-Date

Write-Header "PowerShell TSX/TS File Beautifier"

# Check if Prettier is available
Write-Info "Checking for Prettier..."
try {
    $null = npx prettier --version 2>$null
    Write-Success "Prettier is available"
} catch {
    Write-Warning "Prettier not found. Installing..."
    try {
        npm install --save-dev prettier
        Write-Success "Prettier installed successfully"
    } catch {
        Write-Error "Failed to install Prettier"
        exit 1
    }
}

# Create Prettier config if it doesn't exist
$PrettierConfigPath = ".prettierrc"
if (-not (Test-Path $PrettierConfigPath)) {
    $PrettierConfig = @{
        semi = $true
        trailingComma = "es5"
        singleQuote = $false
        printWidth = 100
        tabWidth = 2
        useTabs = $false
        bracketSpacing = $true
        bracketSameLine = $false
        arrowParens = "avoid"
        endOfLine = "lf"
        quoteProps = "as-needed"
        jsxSingleQuote = $false
        parser = "typescript"
    } | ConvertTo-Json -Depth 10
    
    $PrettierConfig | Out-File -FilePath $PrettierConfigPath -Encoding UTF8
    Write-Success "Created .prettierrc configuration file"
} else {
    Write-Info "Using existing .prettierrc configuration"
}

# Find all TSX/TS files
Write-Info "Scanning for TSX/TS files in: $(Resolve-Path $Directory)"
$TsxFiles = Get-ChildItem -Path $Directory -Recurse -Include "*.tsx", "*.ts" | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|\.next|dist|build" }

if ($TsxFiles.Count -eq 0) {
    Write-Warning "No TSX/TS files found"
    exit 0
}

Write-Info "Found $($TsxFiles.Count) TSX/TS files"

# Ask for confirmation if not in auto mode
if (-not $Auto) {
    $Response = Read-Host "`nDo you want to format all $($TsxFiles.Count) files? (y/N)"
    if ($Response -notmatch "^[Yy]") {
        Write-Info "Operation cancelled"
        exit 0
    }
}

Write-Header "Formatting files..."

# Process files in batches
for ($i = 0; $i -lt $TsxFiles.Count; $i += $BatchSize) {
    $Batch = $TsxFiles[$i..([Math]::Min($i + $BatchSize - 1, $TsxFiles.Count - 1))]
    
    foreach ($File in $Batch) {
        try {
            # Read original content
            $OriginalContent = Get-Content -Path $File.FullName -Raw -ErrorAction Stop
            
            # Format with Prettier using PowerShell's Start-Process for better control
            $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
            $ProcessInfo.FileName = "npx"
            $ProcessInfo.Arguments = "prettier --write `"$($File.FullName)`""
            $ProcessInfo.UseShellExecute = $false
            $ProcessInfo.RedirectStandardOutput = $true
            $ProcessInfo.RedirectStandardError = $true
            $ProcessInfo.CreateNoWindow = $true
            
            $Process = New-Object System.Diagnostics.Process
            $Process.StartInfo = $ProcessInfo
            $Process.Start() | Out-Null
            $Process.WaitForExit()
            
            if ($Process.ExitCode -eq 0) {
                # Check if file was actually changed
                $NewContent = Get-Content -Path $File.FullName -Raw -ErrorAction Stop
                
                if ($OriginalContent -ne $NewContent) {
                    $RelativePath = Resolve-Path -Path $File.FullName -Relative
                    Write-Success "Formatted: $RelativePath"
                    $ProcessedFiles++
                } else {
                    $SkippedFiles++
                }
            } else {
                $ErrorOutput = $Process.StandardError.ReadToEnd()
                $RelativePath = Resolve-Path -Path $File.FullName -Relative
                Write-Error "Failed to format $RelativePath`: $ErrorOutput"
                $ErrorFiles++
            }
        } catch {
            $RelativePath = Resolve-Path -Path $File.FullName -Relative
            Write-Error "Failed to process $RelativePath`: $($_.Exception.Message)"
            $ErrorFiles++
        }
    }
    
    # Show progress
    $Progress = [Math]::Min($i + $BatchSize, $TsxFiles.Count)
    $Percentage = [Math]::Round(($Progress / $TsxFiles.Count) * 100, 1)
    Write-Host "`rProgress: $Progress/$($TsxFiles.Count) files ($Percentage%)" -NoNewline -ForegroundColor Blue
    
    # Small delay to prevent overwhelming the system
    if ($i + $BatchSize -lt $TsxFiles.Count) {
        Start-Sleep -Milliseconds 100
    }
}

Write-Host ""  # New line after progress

# Show summary
$EndTime = Get-Date
$Duration = [Math]::Round(($EndTime - $StartTime).TotalSeconds, 2)

Write-Header "Summary"
Write-Success "Files formatted: $ProcessedFiles"
Write-Info "Files unchanged: $SkippedFiles"

if ($ErrorFiles -gt 0) {
    Write-Error "Files with errors: $ErrorFiles"
}

Write-Info "Total time: ${Duration}s"

if ($ProcessedFiles -gt 0) {
    Write-Success "All files have been beautified!"
} elseif ($ErrorFiles -eq 0) {
    Write-Success "All files were already properly formatted!"
} 