// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ERC721NFT
 * @dev Complete ERC721 NFT Collection Contract with Minting, Royalties, and Access Control
 */
contract ERC721NFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    string public baseTokenURI;
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public royaltyPercentage; // basis points (250 = 2.5%)
    address public royaltyRecipient;
    bool public isPublicMintEnabled;

    mapping(address => bool) public whitelist;
    mapping(uint256 => string) private _tokenURIs;

    event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event BaseURIUpdated(string newBaseURI);
    event MintPriceUpdated(uint256 newPrice);
    event PublicMintToggled(bool enabled);
    event Withdrawn(address indexed recipient, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        uint256 _maxSupply,
        uint256 _royaltyPercentage,
        address _royaltyRecipient,
        uint256 _mintPrice,
        bool _isPublicMint,
        address _owner
    ) ERC721(_name, _symbol) {
        baseTokenURI = _baseTokenURI;
        maxSupply = _maxSupply;
        royaltyPercentage = _royaltyPercentage;
        royaltyRecipient = _royaltyRecipient;
        mintPrice = _mintPrice;
        isPublicMintEnabled = _isPublicMint;

        // Transfer ownership to specified address
        _transferOwnership(_owner);

        // Add owner to whitelist
        whitelist[_owner] = true;
    }

    /**
     * @dev Mint a new NFT
     */
    function mint(string memory tokenURI)
        external
        payable
        nonReentrant
        returns (uint256)
    {
        require(
            isPublicMintEnabled || whitelist[msg.sender] || msg.sender == owner(),
            "Minting not allowed"
        );
        require(
            maxSupply == 0 || _tokenIds.current() < maxSupply,
            "Max supply reached"
        );
        require(msg.value >= mintPrice, "Insufficient payment");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit NFTMinted(msg.sender, newTokenId, tokenURI);

        return newTokenId;
    }

    /**
     * @dev Batch mint NFTs (only owner)
     */
    function batchMint(address[] memory recipients, string[] memory tokenURIs)
        external
        onlyOwner
        nonReentrant
    {
        require(recipients.length == tokenURIs.length, "Array length mismatch");
        require(
            maxSupply == 0 || _tokenIds.current() + recipients.length <= maxSupply,
            "Would exceed max supply"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            _tokenIds.increment();
            uint256 newTokenId = _tokenIds.current();

            _safeMint(recipients[i], newTokenId);
            _setTokenURI(newTokenId, tokenURIs[i]);

            emit NFTMinted(recipients[i], newTokenId, tokenURIs[i]);
        }
    }

    /**
     * @dev Set base URI for all tokens
     */
    function setBaseURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
        emit BaseURIUpdated(_baseTokenURI);
    }

    /**
     * @dev Update mint price
     */
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
        emit MintPriceUpdated(_mintPrice);
    }

    /**
     * @dev Toggle public minting
     */
    function togglePublicMint(bool _enabled) external onlyOwner {
        isPublicMintEnabled = _enabled;
        emit PublicMintToggled(_enabled);
    }

    /**
     * @dev Add addresses to whitelist
     */
    function addToWhitelist(address[] memory addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = true;
        }
    }

    /**
     * @dev Remove addresses from whitelist
     */
    function removeFromWhitelist(address[] memory addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = false;
        }
    }

    /**
     * @dev Get total supply
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Withdraw contract balance
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit Withdrawn(owner(), balance);
    }

    /**
     * @dev EIP-2981 royalty info
     */
    function royaltyInfo(uint256 , uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        royaltyAmount = (salePrice * royaltyPercentage) / 10000;
        receiver = royaltyRecipient;
    }

    /**
     * @dev Override _baseURI
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * @dev Override tokenURI to return custom URI if set
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override _burn
     */
    function _burn(uint256 tokenId)
        internal
        virtual
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    /**
     * @dev Check interface support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
