// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ZeroxPixel is ERC721, ReentrancyGuard {
    uint256 private _tokenIds;
    address payable public treasury;
    address public admin;
    uint256 public constant FEE_PERCENT = 5;
    uint256 public constant MAX_PRICE = 100 ether;

    struct PixelArt {
        string name;
        string description;
        uint256 gridSize;
        string pixelData;
        uint256 price;
        address creator;
        uint256 mintedAt;
        bytes32 artworkHash;
    }

    mapping(uint256 => PixelArt) public tokenData;
    mapping(address => uint256[]) public userTokens;
    mapping(bytes32 => uint256) public artworkRegistry;
    mapping(uint256 => bool) public isTokenListed;
    uint256[] public listedTokens;
    mapping(address => uint256) public pendingRefunds;

    event PixelArtMinted(address indexed minter, uint256 tokenId, string name);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTDelisted(uint256 indexed tokenId);
    event NFTBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);

    constructor(address _admin, address payable _treasury) ERC721("0xPixel", "0xP") {
        require(_admin != address(0), "Invalid admin");
        require(_treasury != address(0), "Invalid treasury");
        admin = _admin;
        treasury = _treasury;
    }

    receive() external payable {}

    function withdraw() external {
        require(msg.sender == admin, "Only admin");
        uint256 balance = address(this).balance;
        require(balance > 0, "Nothing to withdraw");
        payable(admin).transfer(balance);
    }

    function withdrawRefunds(address payable recipient) external {
        require(msg.sender == admin, "Only admin");
        uint256 refund = pendingRefunds[recipient];
        require(refund > 0, "No pending refund");
        pendingRefunds[recipient] = 0;
        recipient.transfer(refund);
    }

    function mint(
        string memory name,
        string memory description,
        uint256 gridSize,
        string memory pixelData
    ) external nonReentrant returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Name must be 1-32 chars");
        require(gridSize == 8 || gridSize == 16 || gridSize == 32 || gridSize == 64, "Invalid grid size");
        require(bytes(pixelData).length > 0, "Pixel data required");
        
        bytes32 artworkHash = keccak256(abi.encodePacked(pixelData, gridSize));
        require(artworkRegistry[artworkHash] == 0, "Artwork already minted");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        _safeMint(msg.sender, newTokenId);
        
        tokenData[newTokenId] = PixelArt({
            name: name,
            description: description,
            gridSize: gridSize,
            pixelData: pixelData,
            price: 0,
            creator: msg.sender,
            mintedAt: block.timestamp,
            artworkHash: artworkHash
        });
        
        artworkRegistry[artworkHash] = newTokenId;
        userTokens[msg.sender].push(newTokenId);
        
        emit PixelArtMinted(msg.sender, newTokenId, name);
        
        return newTokenId;
    }
    
    function isOriginal(bytes32 artworkHash) external view returns (bool) {
        return artworkRegistry[artworkHash] == 0;
    }
    
    function checkOriginality(string memory pixelData, uint256 gridSize) external view returns (bool) {
        bytes32 artworkHash = keccak256(abi.encodePacked(pixelData, gridSize));
        return artworkRegistry[artworkHash] == 0;
    }
    
    function getOriginalCreator(string memory pixelData, uint256 gridSize) external view returns (address) {
        bytes32 artworkHash = keccak256(abi.encodePacked(pixelData, gridSize));
        uint256 existingTokenId = artworkRegistry[artworkHash];
        if (existingTokenId == 0) return address(0);
        return tokenData[existingTokenId].creator;
    }
    
    function listForSale(uint256 tokenId, uint256 priceInWei) external {
        require(ownerOf(tokenId) == msg.sender, "Not your token");
        require(priceInWei > 0, "Price must be <= 100 ETH");
        require(priceInWei <= MAX_PRICE, "Price too high");
        require(tokenData[tokenId].price == 0, "Already listed");

        tokenData[tokenId].price = priceInWei;
        isTokenListed[tokenId] = true;
        listedTokens.push(tokenId);
        
        emit NFTListed(tokenId, priceInWei);
    }

    function delist(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your token");
        require(tokenData[tokenId].price > 0, "Not listed");

        tokenData[tokenId].price = 0;
        isTokenListed[tokenId] = false;
        
        _removeFromListedTokens(tokenId);
        
        emit NFTDelisted(tokenId);
    }
    
    function buyNFT(uint256 tokenId) external payable nonReentrant {
        require(tokenData[tokenId].price > 0, "Not for sale");
        require(msg.value >= tokenData[tokenId].price, "Insufficient payment");

        address seller = ownerOf(tokenId);
        uint256 price = tokenData[tokenId].price;
        uint256 fee = (price * FEE_PERCENT) / 100;
        uint256 sellerAmount = price - fee;

        // CEI Pattern: Clear state BEFORE external calls
        tokenData[tokenId].price = 0;
        isTokenListed[tokenId] = false;
        _removeFromListedTokens(tokenId);

        // Update ownership tracking before transfer
        _removeTokenFromUser(seller, tokenId);
        userTokens[msg.sender].push(tokenId);

        // Transfer NFT first (CEI: Effects before Interactions)
        _transfer(seller, msg.sender, tokenId);

        // Then do external calls (Interactions)
        (bool feeSent, ) = treasury.call{value: fee}("");
        require(feeSent, "Failed to send fee to treasury");

        (bool sentToSeller, ) = payable(seller).call{value: sellerAmount}("");
        require(sentToSeller, "Failed to send to seller");

        // Refund excess
        if (msg.value > price) {
            uint256 refund = msg.value - price;
            (bool refundSent, ) = payable(msg.sender).call{value: refund}("");
            require(refundSent, "Failed to refund");
        }

        emit NFTBought(tokenId, msg.sender, seller, price);
    }
    
    function getPrice(uint256 tokenId) external view returns (uint256) {
        return tokenData[tokenId].price;
    }
    
    function getNFTsForSale() external view returns (uint256[] memory) {
        return listedTokens;
    }

    function getListedTokensCount() external view returns (uint256) {
        return listedTokens.length;
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        
        PixelArt memory art = tokenData[tokenId];
        
        string memory json = string(abi.encodePacked(
            '{"name":"', art.name, '",',
            '"description":"', art.description, '",',
            '"image":"data:image/png;base64,', art.pixelData, '",',
            '"attributes":[{"trait_type":"Grid Size","value":"', 
            Strings.toString(art.gridSize), '"},',
            '{"trait_type":"Creator","value":"', Strings.toHexString(uint160(art.creator), 20), '"},',
            '{"trait_type":"Minted At","value":"', Strings.toString(art.mintedAt), '"}]}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
    
    function getMintedTokens(address owner) external view returns (uint256[] memory) {
        return userTokens[owner];
    }
    
    function getTokenData(uint256 tokenId) external view returns (PixelArt memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenData[tokenId];
    }
    
    function transfer(address to, uint256 tokenId) external {
        require(to != address(0), "Cannot transfer to zero address");
        require(msg.sender == ownerOf(tokenId), "Not your token");
        require(tokenData[tokenId].price == 0, "Cannot transfer listed NFT");

        _removeTokenFromUser(msg.sender, tokenId);
        userTokens[to].push(tokenId);
        _transfer(msg.sender, to, tokenId);
    }

    // Internal helpers
    function _removeFromListedTokens(uint256 tokenId) internal {
        uint256 len = listedTokens.length;
        for (uint256 i = 0; i < len; i++) {
            if (listedTokens[i] == tokenId) {
                listedTokens[i] = listedTokens[len - 1];
                listedTokens.pop();
                break;
            }
        }
    }

    function _removeTokenFromUser(address user, uint256 tokenId) internal {
        uint256[] storage tokens = userTokens[user];
        uint256 len = tokens.length;
        for (uint256 i = 0; i < len; i++) {
            if (tokens[i] == tokenId) {
                tokens[i] = tokens[len - 1];
                tokens.pop();
                break;
            }
        }
    }
}
