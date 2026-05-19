// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ERC1155NFT
 * @dev Complete ERC1155 Multi-Token Collection Contract with Minting, Royalties, and Access Control
 */
contract ERC1155NFT is ERC1155, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    string public name;
    string public symbol;
    string public baseTokenURI;
    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public royaltyPercentage; // basis points (250 = 2.5%)
    address public royaltyRecipient;
    bool public isPublicMintEnabled;

    mapping(address => bool) public whitelist;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => uint256) public tokenSupply;

    event NFTMinted(
        address indexed minter,
        uint256 indexed tokenId,
        uint256 amount,
        string tokenURI
    );
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
    ) ERC1155(_baseTokenURI) {
        name = _name;
        symbol = _symbol;
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
     * @dev Mint new tokens
     */
    function mint(
        uint256 amount,
        string memory tokenURI
    ) external payable nonReentrant returns (uint256) {
        require(
            isPublicMintEnabled || whitelist[msg.sender] || msg.sender == owner(),
            "Minting not allowed"
        );
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value >= mintPrice * amount, "Insufficient payment");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        require(
            maxSupply == 0 || tokenSupply[newTokenId] + amount <= maxSupply,
            "Would exceed max supply"
        );

        _mint(msg.sender, newTokenId, amount, "");
        _tokenURIs[newTokenId] = tokenURI;
        tokenSupply[newTokenId] += amount;

        emit NFTMinted(msg.sender, newTokenId, amount, tokenURI);

        return newTokenId;
    }

    /**
     * @dev Batch mint tokens (only owner)
     */
    function batchMint(
        address[] memory recipients,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        string[] memory tokenURIs
    ) external onlyOwner nonReentrant {
        require(
            recipients.length == tokenIds.length &&
            tokenIds.length == amounts.length &&
            amounts.length == tokenURIs.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];

            require(
                maxSupply == 0 || tokenSupply[tokenId] + amount <= maxSupply,
                "Would exceed max supply"
            );

            _mint(recipients[i], tokenId, amount, "");

            if (bytes(_tokenURIs[tokenId]).length == 0) {
                _tokenURIs[tokenId] = tokenURIs[i];
            }

            tokenSupply[tokenId] += amount;

            emit NFTMinted(recipients[i], tokenId, amount, tokenURIs[i]);
        }
    }

    /**
     * @dev Set base URI
     */
    function setBaseURI(string memory _baseTokenURI) external onlyOwner {
        baseTokenURI = _baseTokenURI;
        _setURI(_baseTokenURI);
        emit BaseURIUpdated(_baseTokenURI);
    }

    /**
     * @dev Set token URI for specific token
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI)
        external
        onlyOwner
    {
        require(tokenSupply[tokenId] > 0, "Token does not exist");
        _tokenURIs[tokenId] = tokenURI;
    }

    /**
     * @dev Get token URI
     */
    function uri(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        string memory tokenURI = _tokenURIs[tokenId];

        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }

        return string(abi.encodePacked(baseTokenURI, _toString(tokenId)));
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
     * @dev Get total number of token types
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Get supply of specific token
     */
    function totalSupply(uint256 tokenId) external view returns (uint256) {
        return tokenSupply[tokenId];
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
    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        royaltyAmount = (salePrice * royaltyPercentage) / 10000;
        receiver = royaltyRecipient;
    }

    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Check interface support
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
