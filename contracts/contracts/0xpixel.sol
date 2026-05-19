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

    struct PixelArt {
        string name;
        string description;
        uint256 gridSize;
        string pixelData; // Base64 encoded pixel data
        uint256 price;    // Price in wei (0 = not for sale)
        address creator;
        uint256 mintedAt;
        bytes32 artworkHash; // Hash to verify uniqueness
    }

    mapping(uint256 => PixelArt) public tokenData;
    mapping(address => uint256[]) public userTokens;
    mapping(bytes32 => uint256) public artworkRegistry; // artworkHash => tokenId (0 = not minted)
    mapping(uint256 => bool) public isTokenListed;
    uint256[] public listedTokens; // O(1) lookup for NFTs for sale

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

    function mint(
        string memory name,
        string memory description,
        uint256 gridSize,
        string memory pixelData
    ) external returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Name must be 1-32 chars");
        require(gridSize == 8 || gridSize == 16 || gridSize == 32 || gridSize == 64, "Invalid grid size");
        require(bytes(pixelData).length > 0, "Pixel data required");
        
        // Create unique hash from pixelData + gridSize
        bytes32 artworkHash = keccak256(abi.encodePacked(pixelData, gridSize));
        
        // Check if this artwork was already minted
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
        
        // Register this artwork hash
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
        require(priceInWei > 0, "Price must be > 0");

        if (tokenData[tokenId].price == 0) {
            listedTokens.push(tokenId);
        }

        tokenData[tokenId].price = priceInWei;
        isTokenListed[tokenId] = true;
        emit NFTListed(tokenId, priceInWei);
    }

    function delist(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not your token");
        require(tokenData[tokenId].price > 0, "Not listed");

        tokenData[tokenId].price = 0;
        isTokenListed[tokenId] = false;

        // Remove from listedTokens array
        uint256 listLen = listedTokens.length;
        for (uint i = 0; i < listLen; i++) {
            if (listedTokens[i] == tokenId) {
                listedTokens[i] = listedTokens[listLen - 1];
                listedTokens.pop();
                break;
            }
        }

        emit NFTDelisted(tokenId);
    }
    
    function buyNFT(uint256 tokenId) external payable nonReentrant {
        require(tokenData[tokenId].price > 0, "Not for sale");
        require(msg.value >= tokenData[tokenId].price, "Insufficient payment");

        address seller = ownerOf(tokenId);
        uint256 price = tokenData[tokenId].price;
        uint256 fee = (price * FEE_PERCENT) / 100;
        uint256 sellerAmount = price - fee;

        _transfer(seller, msg.sender, tokenId);

        uint256[] storage sellerTokens = userTokens[seller];
        for (uint i = 0; i < sellerTokens.length; i++) {
            if (sellerTokens[i] == tokenId) {
                sellerTokens[i] = sellerTokens[sellerTokens.length - 1];
                sellerTokens.pop();
                break;
            }
        }
        userTokens[msg.sender].push(tokenId);

        isTokenListed[tokenId] = false;
        tokenData[tokenId].price = 0;

        // Remove from listedTokens array
        uint256 listLen = listedTokens.length;
        for (uint i = 0; i < listLen; i++) {
            if (listedTokens[i] == tokenId) {
                listedTokens[i] = listedTokens[listLen - 1];
                listedTokens.pop();
                break;
            }
        }

        (bool feeSent, ) = treasury.call{value: fee}("");
        require(feeSent, "Failed to send fee to treasury");

        (bool sentToSeller, ) = payable(seller).call{value: sellerAmount}("");
        require(sentToSeller, "Failed to send to seller");

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
        require(ownerOf(tokenId) == msg.sender, "Not your token");
        require(tokenData[tokenId].price == 0, "Cannot transfer listed NFT");
        _transfer(msg.sender, to, tokenId);
        
        uint256[] storage fromTokens = userTokens[msg.sender];
        for (uint i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                fromTokens.pop();
                break;
            }
        }
        userTokens[to].push(tokenId);
    }
}
