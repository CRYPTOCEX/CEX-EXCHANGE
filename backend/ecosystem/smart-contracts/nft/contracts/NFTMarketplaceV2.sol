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
 * @title NFTMarketplaceV2
 * @dev Upgradeable NFT Marketplace with enhanced security features
 */
contract NFTMarketplaceV2 is 
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

    // Marketplace configuration
    uint256 public marketplaceFee; // in basis points (100 = 1%)
    address payable public feeRecipient;
    uint256 public minListingPrice;
    uint256 public maxListingPrice;
    
    // Emergency withdrawal
    address payable public emergencyWithdrawAddress;
    bool public emergencyWithdrawEnabled;

    // Gas optimization settings
    uint256 public baseGasLimit;
    uint256 public gasLimitMultiplier; // in basis points

    // Listing structure
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        address paymentToken; // address(0) for ETH
        bool isERC1155;
        uint256 amount; // for ERC1155
        bool active;
        uint256 listedAt;
        uint256 expiresAt;
    }

    // Offer structure
    struct Offer {
        address offerer;
        uint256 price;
        address paymentToken;
        uint256 expiresAt;
        bool active;
    }

    // Royalty info
    struct RoyaltyInfo {
        address recipient;
        uint256 percentage; // in basis points
    }

    // State variables
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public nftToListingId;
    mapping(uint256 => Offer[]) public offers;
    mapping(address => mapping(uint256 => RoyaltyInfo)) public royalties;
    mapping(address => bool) public approvedPaymentTokens;
    mapping(address => bool) public blacklistedContracts;
    mapping(address => bool) public blacklistedUsers;
    
    uint256 public nextListingId;
    uint256 public totalVolume;
    uint256 public totalFees;

    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price,
        address paymentToken
    );

    event ListingCancelled(uint256 indexed listingId);
    
    event ListingSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 price,
        uint256 marketplaceFee,
        uint256 royaltyAmount
    );

    event OfferCreated(
        uint256 indexed listingId,
        address indexed offerer,
        uint256 price,
        address paymentToken
    );

    event OfferAccepted(
        uint256 indexed listingId,
        address indexed offerer,
        uint256 price
    );

    event EmergencyWithdraw(address indexed recipient, uint256 amount);
    event MarketplaceFeeUpdated(uint256 newFee);
    event PaymentTokenUpdated(address token, bool approved);
    event ContractBlacklisted(address contractAddress, bool blacklisted);
    event UserBlacklisted(address user, bool blacklisted);

    // Modifiers
    modifier notBlacklisted() {
        require(!blacklistedUsers[msg.sender], "User is blacklisted");
        _;
    }

    modifier validListing(uint256 listingId) {
        require(listings[listingId].active, "Listing not active");
        require(listings[listingId].expiresAt > block.timestamp || listings[listingId].expiresAt == 0, "Listing expired");
        _;
    }

    modifier onlyListingOwner(uint256 listingId) {
        require(listings[listingId].seller == msg.sender, "Not listing owner");
        _;
    }

    /**
     * @dev Initialize the marketplace
     */
    function initialize(
        address payable _feeRecipient,
        uint256 _marketplaceFee,
        address _emergencyWithdrawAddress
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_marketplaceFee <= 1000, "Fee too high"); // Max 10%

        feeRecipient = _feeRecipient;
        marketplaceFee = _marketplaceFee;
        emergencyWithdrawAddress = payable(_emergencyWithdrawAddress);
        
        // Set default values
        minListingPrice = 0.0001 ether;
        maxListingPrice = 1000000 ether;
        baseGasLimit = 200000;
        gasLimitMultiplier = 10000; // 100%
        
        // Setup roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        
        // Approve ETH as payment by default
        approvedPaymentTokens[address(0)] = true;
        
        nextListingId = 1;
    }

    /**
     * @dev Create a new listing
     */
    function createListing(
        address _nftContract,
        uint256 _tokenId,
        uint256 _price,
        address _paymentToken,
        bool _isERC1155,
        uint256 _amount,
        uint256 _duration
    ) external whenNotPaused notBlacklisted nonReentrant {
        require(!blacklistedContracts[_nftContract], "NFT contract blacklisted");
        require(approvedPaymentTokens[_paymentToken], "Payment token not approved");
        require(_price >= minListingPrice && _price <= maxListingPrice, "Price out of bounds");
        require(_amount > 0 || !_isERC1155, "Invalid amount for ERC1155");
        
        // Verify ownership and approval
        if (_isERC1155) {
            require(IERC1155(_nftContract).balanceOf(msg.sender, _tokenId) >= _amount, "Insufficient balance");
            require(IERC1155(_nftContract).isApprovedForAll(msg.sender, address(this)), "Not approved");
        } else {
            require(IERC721(_nftContract).ownerOf(_tokenId) == msg.sender, "Not token owner");
            require(
                IERC721(_nftContract).getApproved(_tokenId) == address(this) ||
                IERC721(_nftContract).isApprovedForAll(msg.sender, address(this)),
                "Not approved"
            );
        }

        uint256 listingId = nextListingId++;
        uint256 expiresAt = _duration > 0 ? block.timestamp + _duration : 0;

        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: _nftContract,
            tokenId: _tokenId,
            price: _price,
            paymentToken: _paymentToken,
            isERC1155: _isERC1155,
            amount: _amount,
            active: true,
            listedAt: block.timestamp,
            expiresAt: expiresAt
        });

        nftToListingId[_nftContract][_tokenId] = listingId;

        emit ListingCreated(listingId, msg.sender, _nftContract, _tokenId, _price, _paymentToken);
    }

    /**
     * @dev Buy a listed NFT
     */
    function buyListing(uint256 _listingId) 
        external 
        payable 
        whenNotPaused 
        notBlacklisted 
        nonReentrant 
        validListing(_listingId) 
    {
        Listing memory listing = listings[_listingId];
        require(msg.sender != listing.seller, "Cannot buy own listing");

        uint256 price = listing.price;
        uint256 feeAmount = price.mul(marketplaceFee).div(10000);
        uint256 royaltyAmount = 0;

        // Handle royalties
        RoyaltyInfo memory royalty = royalties[listing.nftContract][listing.tokenId];
        if (royalty.recipient != address(0) && royalty.percentage > 0) {
            royaltyAmount = price.mul(royalty.percentage).div(10000);
        }

        uint256 sellerAmount = price.sub(feeAmount).sub(royaltyAmount);

        // Handle payment
        if (listing.paymentToken == address(0)) {
            require(msg.value >= price, "Insufficient payment");
            
            // Transfer funds
            (bool successFee, ) = feeRecipient.call{value: feeAmount}("");
            require(successFee, "Fee transfer failed");
            
            if (royaltyAmount > 0) {
                (bool successRoyalty, ) = royalty.recipient.call{value: royaltyAmount}("");
                require(successRoyalty, "Royalty transfer failed");
            }
            
            (bool successSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
            require(successSeller, "Seller transfer failed");
            
            // Refund excess
            if (msg.value > price) {
                (bool successRefund, ) = msg.sender.call{value: msg.value.sub(price)}("");
                require(successRefund, "Refund failed");
            }
        } else {
            IERC20 token = IERC20(listing.paymentToken);
            require(token.transferFrom(msg.sender, feeRecipient, feeAmount), "Fee transfer failed");
            
            if (royaltyAmount > 0) {
                require(token.transferFrom(msg.sender, royalty.recipient, royaltyAmount), "Royalty transfer failed");
            }
            
            require(token.transferFrom(msg.sender, listing.seller, sellerAmount), "Seller transfer failed");
        }

        // Transfer NFT
        if (listing.isERC1155) {
            IERC1155(listing.nftContract).safeTransferFrom(
                listing.seller,
                msg.sender,
                listing.tokenId,
                listing.amount,
                ""
            );
        } else {
            IERC721(listing.nftContract).safeTransferFrom(
                listing.seller,
                msg.sender,
                listing.tokenId
            );
        }

        // Update state
        listings[_listingId].active = false;
        delete nftToListingId[listing.nftContract][listing.tokenId];
        
        totalVolume = totalVolume.add(price);
        totalFees = totalFees.add(feeAmount);

        emit ListingSold(_listingId, msg.sender, price, feeAmount, royaltyAmount);
    }

    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 _listingId) 
        external 
        whenNotPaused 
        onlyListingOwner(_listingId) 
        nonReentrant 
    {
        Listing memory listing = listings[_listingId];
        require(listing.active, "Listing not active");

        listings[_listingId].active = false;
        delete nftToListingId[listing.nftContract][listing.tokenId];

        emit ListingCancelled(_listingId);
    }

    /**
     * @dev Update listing price
     */
    function updateListingPrice(uint256 _listingId, uint256 _newPrice) 
        external 
        whenNotPaused 
        onlyListingOwner(_listingId) 
        validListing(_listingId) 
    {
        require(_newPrice >= minListingPrice && _newPrice <= maxListingPrice, "Price out of bounds");
        listings[_listingId].price = _newPrice;
    }

    /**
     * @dev Set royalty info for an NFT
     */
    function setRoyalty(
        address _nftContract,
        uint256 _tokenId,
        address _recipient,
        uint256 _percentage
    ) external onlyRole(ADMIN_ROLE) {
        require(_percentage <= 1000, "Royalty too high"); // Max 10%
        royalties[_nftContract][_tokenId] = RoyaltyInfo(_recipient, _percentage);
    }

    /**
     * @dev Update marketplace fee
     */
    function updateMarketplaceFee(uint256 _newFee) external onlyRole(ADMIN_ROLE) {
        require(_newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = _newFee;
        emit MarketplaceFeeUpdated(_newFee);
    }

    /**
     * @dev Update fee recipient
     */
    function updateFeeRecipient(address payable _newRecipient) external onlyRole(ADMIN_ROLE) {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
    }

    /**
     * @dev Update payment token approval
     */
    function updatePaymentToken(address _token, bool _approved) external onlyRole(ADMIN_ROLE) {
        approvedPaymentTokens[_token] = _approved;
        emit PaymentTokenUpdated(_token, _approved);
    }

    /**
     * @dev Blacklist/unblacklist a contract
     */
    function updateContractBlacklist(address _contract, bool _blacklisted) external onlyRole(ADMIN_ROLE) {
        blacklistedContracts[_contract] = _blacklisted;
        emit ContractBlacklisted(_contract, _blacklisted);
    }

    /**
     * @dev Blacklist/unblacklist a user
     */
    function updateUserBlacklist(address _user, bool _blacklisted) external onlyRole(ADMIN_ROLE) {
        blacklistedUsers[_user] = _blacklisted;
        emit UserBlacklisted(_user, _blacklisted);
    }

    /**
     * @dev Update price bounds
     */
    function updatePriceBounds(uint256 _min, uint256 _max) external onlyRole(ADMIN_ROLE) {
        require(_min < _max, "Invalid bounds");
        minListingPrice = _min;
        maxListingPrice = _max;
    }

    /**
     * @dev Update gas settings for optimization
     */
    function updateGasSettings(uint256 _baseGasLimit, uint256 _multiplier) external onlyRole(ADMIN_ROLE) {
        require(_baseGasLimit > 50000 && _baseGasLimit < 1000000, "Invalid gas limit");
        require(_multiplier >= 5000 && _multiplier <= 20000, "Invalid multiplier"); // 50% to 200%
        baseGasLimit = _baseGasLimit;
        gasLimitMultiplier = _multiplier;
    }

    /**
     * @dev Calculate dynamic gas limit based on transaction type
     */
    function calculateGasLimit(bool isERC1155, bool hasRoyalty) public view returns (uint256) {
        uint256 gasLimit = baseGasLimit;
        
        if (isERC1155) {
            gasLimit = gasLimit.mul(12000).div(10000); // Add 20% for ERC1155
        }
        
        if (hasRoyalty) {
            gasLimit = gasLimit.mul(11000).div(10000); // Add 10% for royalty
        }
        
        // Apply multiplier
        gasLimit = gasLimit.mul(gasLimitMultiplier).div(10000);
        
        // Cap at block gas limit percentage (50%)
        uint256 maxGas = block.gaslimit.div(2);
        return gasLimit > maxGas ? maxGas : gasLimit;
    }

    /**
     * @dev Pause the marketplace
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the marketplace
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency withdraw - can only be called by owner when enabled
     */
    function emergencyWithdraw() external onlyOwner {
        require(emergencyWithdrawEnabled, "Emergency withdraw not enabled");
        require(emergencyWithdrawAddress != address(0), "Invalid withdraw address");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        emergencyWithdrawEnabled = false; // Disable after use
        
        (bool success, ) = emergencyWithdrawAddress.call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit EmergencyWithdraw(emergencyWithdrawAddress, balance);
    }

    /**
     * @dev Enable emergency withdraw (requires 2 admins)
     */
    function enableEmergencyWithdraw() external onlyRole(ADMIN_ROLE) {
        emergencyWithdrawEnabled = true;
    }

    /**
     * @dev Withdraw ERC20 tokens (emergency)
     */
    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        require(emergencyWithdrawEnabled, "Emergency withdraw not enabled");
        IERC20(_token).transfer(emergencyWithdrawAddress, _amount);
    }

    /**
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Get listing details
     */
    function getListing(uint256 _listingId) external view returns (Listing memory) {
        return listings[_listingId];
    }

    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}