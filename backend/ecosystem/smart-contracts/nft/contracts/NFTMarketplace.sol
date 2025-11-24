// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTMarketplace
 * @dev Core NFT Marketplace for ERC721 and ERC1155 with royalty support
 */
contract NFTMarketplace is ReentrancyGuard, Ownable {

    address payable public feeRecipient;
    uint256 public feePercentage; // basis points (250 = 2.5%)

    struct Listing {
        address seller;
        uint256 price;
        bool active;
        uint256 royaltyPercentage;
        address royaltyRecipient;
    }

    // nftContract => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => bool) public supportedTokenStandards;

    event ItemListed(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event ItemSold(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price,
        uint256 marketplaceFee,
        uint256 royaltyFee
    );

    event ItemCanceled(
        address indexed nftContract,
        uint256 indexed tokenId,
        address indexed seller
    );

    constructor(address payable _feeRecipient, uint256 _feePercentage) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_feePercentage <= 1000, "Fee too high");

        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage;
    }

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 royaltyPercentage,
        address royaltyRecipient
    ) external nonReentrant {
        require(price > 0, "Price must be greater than zero");
        require(royaltyPercentage <= 300, "Royalty percent too high");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
            nft.isApprovedForAll(msg.sender, address(this)),
            "Contract not approved"
        );

        nft.transferFrom(msg.sender, address(this), tokenId);

        listings[nftContract][tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true,
            royaltyPercentage: royaltyPercentage,
            royaltyRecipient: royaltyRecipient
        });

        emit ItemListed(nftContract, tokenId, msg.sender, price);
    }

    function buyItem(address nftContract, uint256 tokenId)
        external
        payable
        nonReentrant
    {
        Listing memory listing = listings[nftContract][tokenId];

        require(listing.active, "Item not for sale");
        require(msg.value >= listing.price, "Insufficient payment");

        listings[nftContract][tokenId].active = false;

        uint256 marketplaceFee = (listing.price * feePercentage) / 10000;
        uint256 royaltyFee = 0;

        if (listing.royaltyRecipient != address(0) && listing.royaltyPercentage > 0) {
            royaltyFee = (listing.price * listing.royaltyPercentage) / 10000;
        }

        uint256 sellerProceeds = listing.price - marketplaceFee - royaltyFee;

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        (bool feeSuccess, ) = feeRecipient.call{value: marketplaceFee}("");
        require(feeSuccess, "Fee transfer failed");

        if (royaltyFee > 0) {
            (bool royaltySuccess, ) = payable(listing.royaltyRecipient).call{value: royaltyFee}("");
            require(royaltySuccess, "Royalty transfer failed");
        }

        (bool sellerSuccess, ) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sellerSuccess, "Seller payment failed");

        if (msg.value > listing.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refundSuccess, "Refund failed");
        }

        emit ItemSold(
            nftContract,
            tokenId,
            msg.sender,
            listing.seller,
            listing.price,
            marketplaceFee,
            royaltyFee
        );
    }

    function cancelListing(address nftContract, uint256 tokenId)
        external
        nonReentrant
    {
        Listing memory listing = listings[nftContract][tokenId];

        require(listing.active, "Item not listed");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listings[nftContract][tokenId].active = false;

        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);

        emit ItemCanceled(nftContract, tokenId, msg.sender);
    }

    function updatePrice(address nftContract, uint256 tokenId, uint256 newPrice)
        external
    {
        Listing storage listing = listings[nftContract][tokenId];

        require(listing.active, "Item not listed");
        require(listing.seller == msg.sender, "Only seller can update");
        require(newPrice > 0, "Price must be greater than zero");

        listing.price = newPrice;
    }

    function getListing(address nftContract, uint256 tokenId)
        external
        view
        returns (
            address seller,
            uint256 price,
            bool active,
            uint256 royaltyPercentage,
            address royaltyRecipient
        )
    {
        Listing memory listing = listings[nftContract][tokenId];
        return (
            listing.seller,
            listing.price,
            listing.active,
            listing.royaltyPercentage,
            listing.royaltyRecipient
        );
    }

    function updateFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high");
        feePercentage = newFeePercentage;
    }

    function updateFeeRecipient(address payable newFeeRecipient) external onlyOwner {
        require(newFeeRecipient != address(0), "Invalid recipient");
        feeRecipient = newFeeRecipient;
    }

    function updateSupportedTokenStandard(address nftContract, bool supported)
        external
        onlyOwner
    {
        supportedTokenStandards[nftContract] = supported;
    }

    function isListed(address nftContract, uint256 tokenId)
        external
        view
        returns (bool)
    {
        return listings[nftContract][tokenId].active;
    }

    function calculateFees(uint256 price, uint256 royaltyPercentage)
        external
        view
        returns (
            uint256 marketplaceFee,
            uint256 royaltyFee,
            uint256 sellerAmount
        )
    {
        marketplaceFee = (price * feePercentage) / 10000;
        royaltyFee = (price * royaltyPercentage) / 10000;
        sellerAmount = price - marketplaceFee - royaltyFee;
    }

    function withdrawBalance() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Emergency withdrawal failed");
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || // ERC165
               interfaceId == 0x150b7a02;   // ERC721TokenReceiver
    }

    receive() external payable {}
}
