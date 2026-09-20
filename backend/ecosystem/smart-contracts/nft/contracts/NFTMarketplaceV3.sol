// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title NFTMarketplaceV3
 * @dev Enhanced NFT Marketplace with reentrancy protection, circuit breakers, and time locks
 */
contract NFTMarketplaceV3 is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    AccessControlUpgradeable 
{
    using SafeMath for uint256;

    // Roles for access control
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Circuit breaker states
    enum CircuitBreakerState { NORMAL, RESTRICTED, EMERGENCY }
    CircuitBreakerState public circuitBreakerState;
    
    // Time lock for critical operations
    uint256 public constant TIME_LOCK_DURATION = 48 hours;
    mapping(bytes32 => uint256) public timeLocks;
    mapping(bytes32 => bool) public timeLockActive;
    
    // Reentrancy guard status tracking
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    
    // Enhanced marketplace configuration
    uint256 public marketplaceFee;
    address payable public feeRecipient;
    uint256 public minListingPrice;
    uint256 public maxListingPrice;
    uint256 public maxTransactionsPerBlock;
    uint256 public currentBlockTransactions;
    uint256 public lastTransactionBlock;
    
    // Emergency settings
    address payable public emergencyWithdrawAddress;
    bool public emergencyWithdrawEnabled;
    uint256 public emergencyThreshold;
    uint256 public emergencyActivationTime;
    
    // Security features
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => bool) public whitelistedContracts;
    mapping(address => uint256) public userTransactionCount;
    mapping(address => uint256) public lastUserTransaction;
    uint256 public minTimeBetweenTransactions;
    
    // Listing structure with enhanced security
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        address paymentToken;
        bool isERC1155;
        uint256 amount;
        uint256 listingTime;
        uint256 expirationTime;
        bytes32 listingHash;
        bool active;
    }
    
    // Auction structure
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 reservePrice;
        uint256 highestBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        mapping(address => uint256) pendingReturns;
    }
    
    // State variables
    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => mapping(uint256 => uint256)) public nftToListingId;
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256) public userBalance;
    
    uint256 public nextListingId;
    uint256 public nextAuctionId;
    uint256 public totalVolume;
    uint256 public totalTransactions;
    
    // Events
    event CircuitBreakerStateChanged(CircuitBreakerState newState);
    event TimeLockInitiated(bytes32 operation, uint256 unlockTime);
    event TimeLockExecuted(bytes32 operation);
    event EmergencyWithdraw(address indexed user, uint256 amount);
    event SecurityIncident(string reason, address indexed actor);
    
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    
    event Sale(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    
    event ListingCancelled(uint256 indexed listingId);
    event AuctionCreated(uint256 indexed auctionId, address indexed seller);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    
    // Modifiers
    modifier notBlacklisted() {
        require(!blacklistedAddresses[msg.sender], "Address is blacklisted");
        _;
    }
    
    modifier onlyWhitelistedContract(address _contract) {
        require(whitelistedContracts[_contract], "Contract not whitelisted");
        _;
    }
    
    modifier circuitBreakerCheck() {
        require(circuitBreakerState != CircuitBreakerState.EMERGENCY, "Emergency mode active");
        if (circuitBreakerState == CircuitBreakerState.RESTRICTED) {
            require(hasRole(OPERATOR_ROLE, msg.sender), "Restricted mode - operators only");
        }
        _;
    }
    
    modifier rateLimitCheck() {
        if (lastUserTransaction[msg.sender] != 0) {
            require(
                block.timestamp >= lastUserTransaction[msg.sender] + minTimeBetweenTransactions,
                "Rate limit exceeded"
            );
        }
        lastUserTransaction[msg.sender] = block.timestamp;
        _;
    }
    
    modifier transactionLimitCheck() {
        if (lastTransactionBlock != block.number) {
            currentBlockTransactions = 0;
            lastTransactionBlock = block.number;
        }
        require(
            currentBlockTransactions < maxTransactionsPerBlock,
            "Block transaction limit reached"
        );
        currentBlockTransactions++;
        _;
    }
    
    modifier withTimelock(bytes32 operation) {
        if (!timeLockActive[operation]) {
            timeLocks[operation] = block.timestamp + TIME_LOCK_DURATION;
            timeLockActive[operation] = true;
            emit TimeLockInitiated(operation, timeLocks[operation]);
            revert("Time lock initiated - wait 48 hours");
        }
        
        require(
            block.timestamp >= timeLocks[operation],
            "Time lock not expired"
        );
        
        timeLockActive[operation] = false;
        emit TimeLockExecuted(operation);
        _;
    }
    
    /**
     * @dev Initialize the marketplace
     */
    function initialize(
        address _feeRecipient,
        uint256 _marketplaceFee
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(EMERGENCY_ROLE, msg.sender);
        
        feeRecipient = payable(_feeRecipient);
        marketplaceFee = _marketplaceFee;
        minListingPrice = 0.001 ether;
        maxListingPrice = 100000 ether;
        maxTransactionsPerBlock = 100;
        minTimeBetweenTransactions = 1 seconds;
        emergencyThreshold = 10 ether;
        
        circuitBreakerState = CircuitBreakerState.NORMAL;
        _status = _NOT_ENTERED;
    }
    
    /**
     * @dev List NFT with enhanced security
     */
    function listNFT(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        uint256 _duration,
        bool _isERC1155,
        uint256 _amount
    ) external 
        whenNotPaused 
        nonReentrant 
        notBlacklisted 
        circuitBreakerCheck
        rateLimitCheck
        transactionLimitCheck
        onlyWhitelistedContract(_nftContract)
    {
        require(_price >= minListingPrice && _price <= maxListingPrice, "Invalid price");
        require(_duration > 0 && _duration <= 365 days, "Invalid duration");
        
        // Verify ownership
        if (_isERC1155) {
            require(
                IERC1155(_nftContract).balanceOf(msg.sender, _tokenId) >= _amount,
                "Insufficient balance"
            );
            IERC1155(_nftContract).safeTransferFrom(
                msg.sender,
                address(this),
                _tokenId,
                _amount,
                ""
            );
        } else {
            require(
                IERC721(_nftContract).ownerOf(_tokenId) == msg.sender,
                "Not token owner"
            );
            IERC721(_nftContract).safeTransferFrom(
                msg.sender,
                address(this),
                _tokenId
            );
        }
        
        uint256 listingId = nextListingId++;
        bytes32 listingHash = keccak256(
            abi.encodePacked(
                msg.sender,
                _nftContract,
                _tokenId,
                _price,
                block.timestamp
            )
        );
        
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _price,
            paymentToken: address(0),
            isERC1155: _isERC1155,
            amount: _amount,
            listingTime: block.timestamp,
            expirationTime: block.timestamp + _duration,
            listingHash: listingHash,
            active: true
        });
        
        nftToListingId[_nftContract][_tokenId] = listingId;
        userListings[msg.sender].push(listingId);
        
        emit Listed(listingId, msg.sender, _nftContract, _tokenId, _price);
    }
    
    /**
     * @dev Buy NFT with reentrancy protection
     */
    function buyNFT(uint256 _listingId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant
        notBlacklisted
        circuitBreakerCheck
        rateLimitCheck
        transactionLimitCheck
    {
        Listing storage listing = listings[_listingId];
        
        require(listing.active, "Listing not active");
        require(listing.expirationTime >= block.timestamp, "Listing expired");
        require(msg.value >= listing.price, "Insufficient payment");
        require(msg.sender != listing.seller, "Cannot buy own NFT");
        
        listing.active = false;
        
        // Calculate fees
        uint256 fee = listing.price.mul(marketplaceFee).div(10000);
        uint256 sellerAmount = listing.price.sub(fee);
        
        // Transfer NFT to buyer
        if (listing.isERC1155) {
            IERC1155(listing.nftContract).safeTransferFrom(
                address(this),
                msg.sender,
                listing.tokenId,
                listing.amount,
                ""
            );
        } else {
            IERC721(listing.nftContract).safeTransferFrom(
                address(this),
                msg.sender,
                listing.tokenId
            );
        }
        
        // Transfer payments (using call for reentrancy protection)
        (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");
        
        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sellerSuccess, "Seller payment failed");
        
        // Refund excess payment
        if (msg.value > listing.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - listing.price
            }("");
            require(refundSuccess, "Refund failed");
        }
        
        totalVolume = totalVolume.add(listing.price);
        totalTransactions = totalTransactions.add(1);
        
        emit Sale(_listingId, msg.sender, listing.seller, listing.price);
    }
    
    /**
     * @dev Cancel listing
     */
    function cancelListing(uint256 _listingId) 
        external 
        nonReentrant
        notBlacklisted
    {
        Listing storage listing = listings[_listingId];
        
        require(listing.active, "Listing not active");
        require(
            listing.seller == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        listing.active = false;
        
        // Return NFT to seller
        if (listing.isERC1155) {
            IERC1155(listing.nftContract).safeTransferFrom(
                address(this),
                listing.seller,
                listing.tokenId,
                listing.amount,
                ""
            );
        } else {
            IERC721(listing.nftContract).safeTransferFrom(
                address(this),
                listing.seller,
                listing.tokenId
            );
        }
        
        emit ListingCancelled(_listingId);
    }
    
    /**
     * @dev Circuit breaker functions
     */
    function setCircuitBreaker(CircuitBreakerState _state) 
        external 
        onlyRole(EMERGENCY_ROLE) 
    {
        require(_state != circuitBreakerState, "State unchanged");
        
        if (_state == CircuitBreakerState.EMERGENCY) {
            emergencyActivationTime = block.timestamp;
        }
        
        circuitBreakerState = _state;
        emit CircuitBreakerStateChanged(_state);
        
        if (_state == CircuitBreakerState.EMERGENCY) {
            _pause();
        } else if (_state == CircuitBreakerState.NORMAL) {
            _unpause();
        }
    }
    
    /**
     * @dev Emergency withdraw with time lock
     */
    function emergencyWithdraw() 
        external 
        onlyRole(EMERGENCY_ROLE)
        withTimelock(keccak256("EMERGENCY_WITHDRAW"))
    {
        require(
            circuitBreakerState == CircuitBreakerState.EMERGENCY,
            "Not in emergency mode"
        );
        require(
            block.timestamp >= emergencyActivationTime + 24 hours,
            "Emergency cooldown active"
        );
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = emergencyWithdrawAddress.call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdraw(msg.sender, balance);
    }
    
    /**
     * @dev Update critical settings with time lock
     */
    function updateMarketplaceFee(uint256 _newFee) 
        external 
        onlyRole(ADMIN_ROLE)
        withTimelock(keccak256(abi.encodePacked("UPDATE_FEE", _newFee)))
    {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _newFee;
    }
    
    function updateFeeRecipient(address payable _newRecipient) 
        external 
        onlyRole(ADMIN_ROLE)
        withTimelock(keccak256(abi.encodePacked("UPDATE_RECIPIENT", _newRecipient)))
    {
        require(_newRecipient != address(0), "Invalid address");
        feeRecipient = _newRecipient;
    }
    
    /**
     * @dev Blacklist management
     */
    function updateBlacklist(address _address, bool _blacklisted) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        blacklistedAddresses[_address] = _blacklisted;
        
        if (_blacklisted) {
            emit SecurityIncident("Address blacklisted", _address);
        }
    }
    
    /**
     * @dev Whitelist NFT contracts
     */
    function updateContractWhitelist(address _contract, bool _whitelisted) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        whitelistedContracts[_contract] = _whitelisted;
    }
    
    /**
     * @dev Update security parameters
     */
    function updateSecurityParameters(
        uint256 _maxTransactionsPerBlock,
        uint256 _minTimeBetweenTransactions,
        uint256 _minListingPrice,
        uint256 _maxListingPrice
    ) external onlyRole(ADMIN_ROLE) {
        maxTransactionsPerBlock = _maxTransactionsPerBlock;
        minTimeBetweenTransactions = _minTimeBetweenTransactions;
        minListingPrice = _minListingPrice;
        maxListingPrice = _maxListingPrice;
    }
    
    /**
     * @dev Pause/unpause functionality
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(OPERATOR_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Required for UUPS proxy pattern
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev Get user's active listings
     */
    function getUserListings(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userListings[_user];
    }
    
    /**
     * @dev Check if address is authorized for emergency operations
     */
    function isEmergencyAuthorized(address _address) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(EMERGENCY_ROLE, _address);
    }
    
    /**
     * @dev Get circuit breaker status
     */
    function getCircuitBreakerStatus() 
        external 
        view 
        returns (
            CircuitBreakerState state,
            uint256 activationTime,
            bool isPaused
        ) 
    {
        return (
            circuitBreakerState,
            emergencyActivationTime,
            paused()
        );
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
    
    /**
     * @dev Fallback function
     */
    fallback() external payable {}
}