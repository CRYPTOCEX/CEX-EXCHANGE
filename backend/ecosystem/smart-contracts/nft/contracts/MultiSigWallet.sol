// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/**
 * @title MultiSigWallet
 * @dev Multi-signature wallet for NFT marketplace critical operations
 * Requires multiple signatures for executing transactions
 */
contract MultiSigWallet is 
    Initializable, 
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable 
{
    // Roles
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    
    // Transaction structure
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        string description;
        bool executed;
        uint256 confirmations;
        uint256 proposedAt;
        uint256 executedAt;
        TransactionType txType;
    }

    // Transaction types for categorization
    enum TransactionType {
        TRANSFER,
        CONTRACT_CALL,
        MARKETPLACE_CONFIG,
        EMERGENCY_ACTION,
        ROLE_MANAGEMENT,
        UPGRADE
    }

    // State variables
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;
    mapping(address => bool) public isSigner;
    address[] public signers;
    uint256 public requiredConfirmations;
    uint256 public transactionCount;
    uint256 public dailyLimit;
    uint256 public dailySpent;
    uint256 public lastResetTime;

    // Time locks for different transaction types
    mapping(TransactionType => uint256) public timeLocks;
    mapping(uint256 => uint256) public transactionUnlockTime;

    // Events
    event TransactionProposed(
        uint256 indexed transactionId,
        address indexed proposer,
        address indexed to,
        uint256 value,
        TransactionType txType
    );
    
    event TransactionConfirmed(
        uint256 indexed transactionId,
        address indexed signer
    );
    
    event TransactionRevoked(
        uint256 indexed transactionId,
        address indexed signer
    );
    
    event TransactionExecuted(
        uint256 indexed transactionId,
        address indexed executor
    );
    
    event TransactionCancelled(
        uint256 indexed transactionId,
        address indexed canceller
    );
    
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event RequirementChanged(uint256 required);
    event DailyLimitChanged(uint256 newLimit);
    event Deposit(address indexed sender, uint256 value);

    // Modifiers
    modifier onlySigner() {
        require(isSigner[msg.sender], "Not a signer");
        _;
    }

    modifier transactionExists(uint256 transactionId) {
        require(transactions[transactionId].to != address(0), "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 transactionId) {
        require(!transactions[transactionId].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 transactionId) {
        require(!confirmations[transactionId][msg.sender], "Transaction already confirmed");
        _;
    }

    modifier confirmed(uint256 transactionId) {
        require(confirmations[transactionId][msg.sender], "Transaction not confirmed");
        _;
    }

    /**
     * @dev Initialize the multi-sig wallet
     */
    function initialize(
        address[] memory _signers,
        uint256 _requiredConfirmations,
        uint256 _dailyLimit
    ) public initializer {
        require(_signers.length > 0, "Signers required");
        require(
            _requiredConfirmations > 0 && _requiredConfirmations <= _signers.length,
            "Invalid required confirmations"
        );

        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Invalid signer");
            require(!isSigner[signer], "Duplicate signer");
            
            isSigner[signer] = true;
            signers.push(signer);
            _grantRole(SIGNER_ROLE, signer);
        }

        requiredConfirmations = _requiredConfirmations;
        dailyLimit = _dailyLimit;
        lastResetTime = block.timestamp;

        // Set default time locks (in seconds)
        timeLocks[TransactionType.TRANSFER] = 0; // No delay for transfers
        timeLocks[TransactionType.CONTRACT_CALL] = 3600; // 1 hour
        timeLocks[TransactionType.MARKETPLACE_CONFIG] = 7200; // 2 hours
        timeLocks[TransactionType.EMERGENCY_ACTION] = 0; // No delay for emergencies
        timeLocks[TransactionType.ROLE_MANAGEMENT] = 86400; // 24 hours
        timeLocks[TransactionType.UPGRADE] = 172800; // 48 hours

        _grantRole(DEFAULT_ADMIN_ROLE, address(this));
    }

    /**
     * @dev Propose a new transaction
     */
    function proposeTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        string memory _description,
        TransactionType _txType
    ) public onlySigner returns (uint256) {
        require(_to != address(0), "Invalid recipient");
        
        uint256 transactionId = transactionCount++;
        
        transactions[transactionId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            description: _description,
            executed: false,
            confirmations: 0,
            proposedAt: block.timestamp,
            executedAt: 0,
            txType: _txType
        });

        // Set unlock time based on transaction type
        transactionUnlockTime[transactionId] = block.timestamp + timeLocks[_txType];

        emit TransactionProposed(transactionId, msg.sender, _to, _value, _txType);
        
        // Auto-confirm for proposer
        confirmTransaction(transactionId);
        
        return transactionId;
    }

    /**
     * @dev Confirm a transaction
     */
    function confirmTransaction(uint256 _transactionId)
        public
        onlySigner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
        notConfirmed(_transactionId)
    {
        confirmations[_transactionId][msg.sender] = true;
        transactions[_transactionId].confirmations++;
        
        emit TransactionConfirmed(_transactionId, msg.sender);
        
        // Auto-execute if enough confirmations and time lock passed
        if (canExecute(_transactionId)) {
            executeTransaction(_transactionId);
        }
    }

    /**
     * @dev Revoke confirmation
     */
    function revokeConfirmation(uint256 _transactionId)
        public
        onlySigner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
        confirmed(_transactionId)
    {
        confirmations[_transactionId][msg.sender] = false;
        transactions[_transactionId].confirmations--;
        
        emit TransactionRevoked(_transactionId, msg.sender);
    }

    /**
     * @dev Execute a confirmed transaction
     */
    function executeTransaction(uint256 _transactionId)
        public
        onlySigner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
        nonReentrant
    {
        require(canExecute(_transactionId), "Cannot execute transaction");

        Transaction storage txn = transactions[_transactionId];
        
        // Check daily limit for transfers
        if (txn.txType == TransactionType.TRANSFER) {
            updateDailySpent(txn.value);
        }
        
        txn.executed = true;
        txn.executedAt = block.timestamp;

        // Execute the transaction
        (bool success, bytes memory returnData) = txn.to.call{value: txn.value}(txn.data);
        require(success, string(abi.encodePacked("Transaction failed: ", returnData)));
        
        emit TransactionExecuted(_transactionId, msg.sender);
    }

    /**
     * @dev Cancel a proposed transaction (requires majority)
     */
    function cancelTransaction(uint256 _transactionId)
        public
        onlySigner
        transactionExists(_transactionId)
        notExecuted(_transactionId)
    {
        require(
            transactions[_transactionId].confirmations >= (signers.length / 2),
            "Requires majority to cancel"
        );
        
        delete transactions[_transactionId];
        emit TransactionCancelled(_transactionId, msg.sender);
    }

    /**
     * @dev Check if transaction can be executed
     */
    function canExecute(uint256 _transactionId) public view returns (bool) {
        Transaction memory txn = transactions[_transactionId];
        
        if (txn.executed) return false;
        if (txn.confirmations < requiredConfirmations) return false;
        if (block.timestamp < transactionUnlockTime[_transactionId]) return false;
        
        // Check daily limit for transfers
        if (txn.txType == TransactionType.TRANSFER) {
            uint256 spentToday = getDailySpent();
            if (spentToday + txn.value > dailyLimit && dailyLimit > 0) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @dev Add a new signer (requires multi-sig)
     */
    function addSigner(address _signer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_signer != address(0), "Invalid signer");
        require(!isSigner[_signer], "Already a signer");
        
        isSigner[_signer] = true;
        signers.push(_signer);
        _grantRole(SIGNER_ROLE, _signer);
        
        emit SignerAdded(_signer);
    }

    /**
     * @dev Remove a signer (requires multi-sig)
     */
    function removeSigner(address _signer) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isSigner[_signer], "Not a signer");
        require(signers.length > requiredConfirmations, "Cannot remove signer");
        
        isSigner[_signer] = false;
        _revokeRole(SIGNER_ROLE, _signer);
        
        // Remove from signers array
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == _signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(_signer);
    }

    /**
     * @dev Change required confirmations (requires multi-sig)
     */
    function changeRequirement(uint256 _required) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            _required > 0 && _required <= signers.length,
            "Invalid requirement"
        );
        
        requiredConfirmations = _required;
        emit RequirementChanged(_required);
    }

    /**
     * @dev Change daily limit
     */
    function changeDailyLimit(uint256 _dailyLimit) public onlyRole(DEFAULT_ADMIN_ROLE) {
        dailyLimit = _dailyLimit;
        emit DailyLimitChanged(_dailyLimit);
    }

    /**
     * @dev Update time lock for transaction type
     */
    function updateTimeLock(TransactionType _type, uint256 _seconds) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(_seconds <= 604800, "Time lock too long"); // Max 7 days
        timeLocks[_type] = _seconds;
    }

    /**
     * @dev Get daily spent amount
     */
    function getDailySpent() public view returns (uint256) {
        if (block.timestamp > lastResetTime + 86400) {
            return 0;
        }
        return dailySpent;
    }

    /**
     * @dev Update daily spent amount
     */
    function updateDailySpent(uint256 _amount) private {
        if (block.timestamp > lastResetTime + 86400) {
            dailySpent = 0;
            lastResetTime = block.timestamp;
        }
        
        dailySpent += _amount;
        require(dailySpent <= dailyLimit || dailyLimit == 0, "Daily limit exceeded");
    }

    /**
     * @dev Get transaction details
     */
    function getTransaction(uint256 _transactionId) 
        public 
        view 
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmationsCount
        ) 
    {
        Transaction memory txn = transactions[_transactionId];
        return (
            txn.to,
            txn.value,
            txn.data,
            txn.executed,
            txn.confirmations
        );
    }

    /**
     * @dev Get confirmation status for a transaction
     */
    function getConfirmations(uint256 _transactionId) 
        public 
        view 
        returns (address[] memory) 
    {
        address[] memory confirmationList = new address[](transactions[_transactionId].confirmations);
        uint256 count = 0;
        
        for (uint256 i = 0; i < signers.length; i++) {
            if (confirmations[_transactionId][signers[i]]) {
                confirmationList[count] = signers[i];
                count++;
            }
        }
        
        return confirmationList;
    }

    /**
     * @dev Get pending transactions
     */
    function getPendingTransactions() public view returns (uint256[] memory) {
        uint256 pendingCount = 0;
        
        // Count pending transactions
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed && transactions[i].to != address(0)) {
                pendingCount++;
            }
        }
        
        // Collect pending transaction IDs
        uint256[] memory pendingIds = new uint256[](pendingCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < transactionCount; i++) {
            if (!transactions[i].executed && transactions[i].to != address(0)) {
                pendingIds[index] = i;
                index++;
            }
        }
        
        return pendingIds;
    }

    /**
     * @dev Get signers list
     */
    function getSigners() public view returns (address[] memory) {
        return signers;
    }

    /**
     * @dev Check if address is signer
     */
    function isSignerAddress(address _address) public view returns (bool) {
        return isSigner[_address];
    }

    /**
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {}

    /**
     * @dev Receive ETH
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Fallback
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value);
    }
}