// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title RoyaltyRegistry
 * @dev On-chain royalty registry with EIP-2981 support
 * Enforces royalty payments at the protocol level
 */
contract RoyaltyRegistry is Initializable, OwnableUpgradeable {
    
    // Royalty info structure
    struct RoyaltyInfo {
        address recipient;
        uint96 percentage; // Basis points (100 = 1%)
        bool enforced;
        uint256 minAmount;
    }
    
    // Events
    event RoyaltySet(
        address indexed collection,
        uint256 indexed tokenId,
        address recipient,
        uint96 percentage
    );
    
    event RoyaltyUpdated(
        address indexed collection,
        uint256 indexed tokenId,
        address recipient,
        uint96 percentage
    );
    
    event RoyaltyEnforced(
        address indexed collection,
        uint256 indexed tokenId,
        address from,
        address to,
        uint256 amount
    );
    
    event DefaultRoyaltySet(
        address indexed collection,
        address recipient,
        uint96 percentage
    );
    
    // State variables
    mapping(address => mapping(uint256 => RoyaltyInfo)) public royalties;
    mapping(address => RoyaltyInfo) public defaultRoyalties;
    mapping(address => bool) public enforcedCollections;
    mapping(address => bool) public approvedMarketplaces;
    
    uint96 public constant MAX_ROYALTY_PERCENTAGE = 1000; // 10%
    uint256 public minRoyaltyAmount;
    bool public globalEnforcement;
    
    // Modifiers
    modifier onlyApprovedMarketplace() {
        require(
            approvedMarketplaces[msg.sender] || msg.sender == owner(),
            "Not approved marketplace"
        );
        _;
    }
    
    /**
     * @dev Initialize the registry
     */
    function initialize(uint256 _minRoyaltyAmount) public initializer {
        __Ownable_init();
        minRoyaltyAmount = _minRoyaltyAmount;
        globalEnforcement = true;
    }
    
    /**
     * @dev Set royalty for specific token
     */
    function setTokenRoyalty(
        address collection,
        uint256 tokenId,
        address recipient,
        uint96 percentage
    ) external {
        require(recipient != address(0), "Invalid recipient");
        require(percentage <= MAX_ROYALTY_PERCENTAGE, "Royalty too high");
        
        // Check authorization (collection owner or token creator)
        require(
            _isAuthorized(collection, tokenId, msg.sender),
            "Not authorized"
        );
        
        royalties[collection][tokenId] = RoyaltyInfo({
            recipient: recipient,
            percentage: percentage,
            enforced: true,
            minAmount: minRoyaltyAmount
        });
        
        emit RoyaltySet(collection, tokenId, recipient, percentage);
    }
    
    /**
     * @dev Set default royalty for collection
     */
    function setDefaultRoyalty(
        address collection,
        address recipient,
        uint96 percentage
    ) external {
        require(recipient != address(0), "Invalid recipient");
        require(percentage <= MAX_ROYALTY_PERCENTAGE, "Royalty too high");
        
        // Check collection ownership
        require(
            _isCollectionOwner(collection, msg.sender),
            "Not collection owner"
        );
        
        defaultRoyalties[collection] = RoyaltyInfo({
            recipient: recipient,
            percentage: percentage,
            enforced: true,
            minAmount: minRoyaltyAmount
        });
        
        emit DefaultRoyaltySet(collection, recipient, percentage);
    }
    
    /**
     * @dev Get royalty info for token (EIP-2981 compatible)
     */
    function royaltyInfo(
        address collection,
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        RoyaltyInfo memory info = royalties[collection][tokenId];
        
        // Fall back to default if no specific royalty
        if (info.recipient == address(0)) {
            info = defaultRoyalties[collection];
        }
        
        if (info.recipient == address(0)) {
            return (address(0), 0);
        }
        
        royaltyAmount = (salePrice * info.percentage) / 10000;
        
        // Enforce minimum royalty amount
        if (royaltyAmount < info.minAmount && salePrice >= info.minAmount) {
            royaltyAmount = info.minAmount;
        }
        
        return (info.recipient, royaltyAmount);
    }
    
    /**
     * @dev Calculate and enforce royalty payment
     */
    function calculateRoyalty(
        address collection,
        uint256 tokenId,
        uint256 salePrice
    ) public view returns (
        address recipient,
        uint256 amount,
        bool enforced
    ) {
        RoyaltyInfo memory info = royalties[collection][tokenId];
        
        if (info.recipient == address(0)) {
            info = defaultRoyalties[collection];
        }
        
        if (info.recipient == address(0)) {
            // Check if collection implements EIP-2981
            try IERC2981(collection).royaltyInfo(tokenId, salePrice) returns (
                address receiver,
                uint256 royaltyAmount
            ) {
                return (receiver, royaltyAmount, globalEnforcement);
            } catch {
                return (address(0), 0, false);
            }
        }
        
        amount = (salePrice * info.percentage) / 10000;
        
        if (amount < info.minAmount && salePrice >= info.minAmount) {
            amount = info.minAmount;
        }
        
        return (info.recipient, amount, info.enforced || globalEnforcement);
    }
    
    /**
     * @dev Process royalty payment (called by marketplace)
     */
    function processRoyaltyPayment(
        address collection,
        uint256 tokenId,
        address from,
        uint256 salePrice
    ) external payable onlyApprovedMarketplace returns (uint256 royaltyPaid) {
        (
            address recipient,
            uint256 royaltyAmount,
            bool enforced
        ) = calculateRoyalty(collection, tokenId, salePrice);
        
        if (recipient == address(0) || royaltyAmount == 0) {
            return 0;
        }
        
        if (enforced) {
            require(msg.value >= royaltyAmount, "Insufficient royalty payment");
        }
        
        // Transfer royalty
        uint256 actualPayment = msg.value < royaltyAmount ? msg.value : royaltyAmount;
        
        if (actualPayment > 0) {
            (bool success, ) = payable(recipient).call{value: actualPayment}("");
            require(success, "Royalty transfer failed");
            
            emit RoyaltyEnforced(
                collection,
                tokenId,
                from,
                recipient,
                actualPayment
            );
        }
        
        // Refund excess
        if (msg.value > actualPayment) {
            (bool refundSuccess, ) = payable(msg.sender).call{
                value: msg.value - actualPayment
            }("");
            require(refundSuccess, "Refund failed");
        }
        
        return actualPayment;
    }
    
    /**
     * @dev Batch set royalties
     */
    function batchSetRoyalties(
        address[] calldata collections,
        uint256[] calldata tokenIds,
        address[] calldata recipients,
        uint96[] calldata percentages
    ) external {
        require(
            collections.length == tokenIds.length &&
            tokenIds.length == recipients.length &&
            recipients.length == percentages.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < collections.length; i++) {
            require(
                _isAuthorized(collections[i], tokenIds[i], msg.sender),
                "Not authorized for token"
            );
            
            royalties[collections[i]][tokenIds[i]] = RoyaltyInfo({
                recipient: recipients[i],
                percentage: percentages[i],
                enforced: true,
                minAmount: minRoyaltyAmount
            });
            
            emit RoyaltySet(
                collections[i],
                tokenIds[i],
                recipients[i],
                percentages[i]
            );
        }
    }
    
    /**
     * @dev Update royalty recipient
     */
    function updateRoyaltyRecipient(
        address collection,
        uint256 tokenId,
        address newRecipient
    ) external {
        RoyaltyInfo storage info = royalties[collection][tokenId];
        require(info.recipient == msg.sender, "Not current recipient");
        require(newRecipient != address(0), "Invalid recipient");
        
        info.recipient = newRecipient;
        
        emit RoyaltyUpdated(
            collection,
            tokenId,
            newRecipient,
            info.percentage
        );
    }
    
    /**
     * @dev Set collection enforcement
     */
    function setCollectionEnforcement(
        address collection,
        bool enforced
    ) external onlyOwner {
        enforcedCollections[collection] = enforced;
    }
    
    /**
     * @dev Approve marketplace
     */
    function approveMarketplace(
        address marketplace,
        bool approved
    ) external onlyOwner {
        approvedMarketplaces[marketplace] = approved;
    }
    
    /**
     * @dev Set global enforcement
     */
    function setGlobalEnforcement(bool enforced) external onlyOwner {
        globalEnforcement = enforced;
    }
    
    /**
     * @dev Set minimum royalty amount
     */
    function setMinRoyaltyAmount(uint256 amount) external onlyOwner {
        minRoyaltyAmount = amount;
    }
    
    /**
     * @dev Check if address is authorized for token
     */
    function _isAuthorized(
        address collection,
        uint256 tokenId,
        address account
    ) private view returns (bool) {
        // This would check with the NFT contract
        // Simplified for example
        try IERC721(collection).ownerOf(tokenId) returns (address owner) {
            return owner == account;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Check if address is collection owner
     */
    function _isCollectionOwner(
        address collection,
        address account
    ) private view returns (bool) {
        // This would check collection ownership
        // Could integrate with collection registry
        try OwnableUpgradeable(collection).owner() returns (address owner) {
            return owner == account;
        } catch {
            return false;
        }
    }
    
    /**
     * @dev Check if royalty is enforced for sale
     */
    function isRoyaltyEnforced(
        address collection,
        uint256 tokenId
    ) external view returns (bool) {
        if (globalEnforcement) return true;
        if (enforcedCollections[collection]) return true;
        
        RoyaltyInfo memory info = royalties[collection][tokenId];
        if (info.enforced) return true;
        
        info = defaultRoyalties[collection];
        return info.enforced;
    }
    
    /**
     * @dev Get royalty percentage
     */
    function getRoyaltyPercentage(
        address collection,
        uint256 tokenId
    ) external view returns (uint96) {
        RoyaltyInfo memory info = royalties[collection][tokenId];
        
        if (info.recipient == address(0)) {
            info = defaultRoyalties[collection];
        }
        
        return info.percentage;
    }
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}