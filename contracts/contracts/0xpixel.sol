// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract ZeroxPixel is ERC721, IERC2981, ReentrancyGuard {
    uint256 private _tokenIds;
    address payable public immutable devWallet;

    struct PixelArt {
        string name;
        string description;
        uint256 gridSize;
        string pixelData;
        uint256 price;
        address creator;
        uint256 mintedAt;
        bytes32 artworkHash;
        uint256 score;
    }

    mapping(uint256 => PixelArt) public tokenData;
    mapping(address => uint256[]) public userTokens;
    mapping(bytes32 => uint256) public artworkRegistry;
    mapping(uint256 => bool) public isTokenListed;
    uint256[] public listedTokens;
    mapping(uint256 => uint256) public listedIndex;
    mapping(uint256 => uint256) public userTokenIndex;
    mapping(address => uint256) public pendingWithdrawals;

    event Minted(address indexed, uint256 indexed, string);
    event Listed(uint256 indexed, uint256);
    event Delisted(uint256 indexed);
    event Sold(uint256 indexed, address indexed, address indexed, uint256);
    event Withdrawn(address indexed, uint256);

    constructor(address payable _devWallet) ERC721("0xPixel", "0xP") {
        require(_devWallet != address(0), "Zero dev wallet");
        devWallet = _devWallet;
    }

    receive() external payable {}

    function supportsInterface(bytes4 id) public view override(ERC721, IERC165) returns (bool) {
        return id == type(IERC2981).interfaceId || super.supportsInterface(id);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address, uint256) {
        require(_ownerOf(tokenId) != address(0), "Token not exist");
        return (tokenData[tokenId].creator, (salePrice * 25) / 1000);
    }

    function withdrawPending() external nonReentrant {
        uint256 amt = pendingWithdrawals[msg.sender];
        require(amt != 0, "No pending");
        delete pendingWithdrawals[msg.sender];
        _safeSend(payable(msg.sender), amt);
        emit Withdrawn(msg.sender, amt);
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        if (from != address(0)) {
            uint256 idx = userTokenIndex[tokenId];
            uint256[] storage fromTokens = userTokens[from];
            uint256 last = fromTokens[fromTokens.length - 1];
            fromTokens[idx] = last;
            userTokenIndex[last] = idx;
            fromTokens.pop();
            delete userTokenIndex[tokenId];
        }

        if (to != address(0)) {
            userTokens[to].push(tokenId);
            userTokenIndex[tokenId] = userTokens[to].length - 1;
        }

        if (from != address(0) && isTokenListed[tokenId]) {
            delete tokenData[tokenId].price;
            delete isTokenListed[tokenId];
            _rmListed(tokenId);
        }

        return super._update(to, tokenId, auth);
    }

    function mint(string calldata name, string calldata desc, uint256 grid, string calldata px) external nonReentrant returns (uint256) {
        require(bytes(name).length != 0 && bytes(name).length <= 32, "Invalid name");
        require(bytes(desc).length <= 256, "Desc too long");
        require(grid == 8 || grid == 16 || grid == 32 || grid == 64 || grid == 128, "Invalid grid");
        require(bytes(px).length != 0 && bytes(px).length <= 50000, "Invalid px");

        bytes32 h = keccak256(abi.encodePacked(px, grid));
        require(artworkRegistry[h] == 0, "Artwork exists");

        _tokenIds++;
        uint256 id = _tokenIds;
        _safeMint(msg.sender, id);

        tokenData[id].name = name;
        tokenData[id].description = desc;
        tokenData[id].gridSize = grid;
        tokenData[id].pixelData = px;
        tokenData[id].creator = msg.sender;
        tokenData[id].mintedAt = block.timestamp;
        tokenData[id].artworkHash = h;

        artworkRegistry[h] = id;
        emit Minted(msg.sender, id, name);
        return id;
    }

    function checkOriginal(string calldata px, uint256 grid) external view returns (bool) {
        return artworkRegistry[keccak256(abi.encodePacked(px, grid))] == 0;
    }

    function getCreator(string calldata px, uint256 grid) external view returns (address) {
        bytes32 h = keccak256(abi.encodePacked(px, grid));
        uint256 id = artworkRegistry[h];
        return id == 0 ? address(0) : tokenData[id].creator;
    }

    function listForSale(uint256 id, uint256 price) external nonReentrant {
        require(_ownerOf(id) == msg.sender, "Not owner");
        require(price != 0, "Zero price");
        require(!isTokenListed[id], "Already listed");
        require(price <= 1000 ether, "Price too high");

        tokenData[id].price = price;
        isTokenListed[id] = true;
        listedTokens.push(id);
        listedIndex[id] = listedTokens.length - 1;
        emit Listed(id, price);
    }

    function delist(uint256 id) external nonReentrant {
        require(_ownerOf(id) == msg.sender, "Not owner");
        require(isTokenListed[id], "Not listed");

        delete tokenData[id].price;
        delete isTokenListed[id];
        _rmListed(id);
        emit Delisted(id);
    }

    function buyNFT(uint256 id) external payable nonReentrant {
        require(isTokenListed[id], "Not listed");
        require(msg.value >= tokenData[id].price, "Insufficient payment");
        require(msg.sender != _ownerOf(id), "Cannot buy own");

        address seller = _ownerOf(id);
        address origCreator = tokenData[id].creator;
        uint256 price = tokenData[id].price;
        uint256 devFee = (price * 25) / 1000;
        uint256 sellerAmt = price - devFee;

        delete tokenData[id].price;
        delete isTokenListed[id];
        _rmListed(id);
        ++tokenData[id].score;
        _transfer(seller, msg.sender, id);

        if (seller != origCreator) {
            uint256 royalty = (price * 25) / 1000;
            sellerAmt -= royalty;
            pendingWithdrawals[origCreator] += royalty;
        }

        pendingWithdrawals[devWallet] += devFee;
        pendingWithdrawals[seller] += sellerAmt;

        if (msg.value > price) {
            _safeSend(payable(msg.sender), msg.value - price);
        }
        emit Sold(id, msg.sender, seller, price);
    }

    function getScore(uint256 id) external view returns (uint256) {
        return tokenData[id].score;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        require(_ownerOf(id) != address(0), "Token not exist");
        PixelArt storage art = tokenData[id];
        string memory scoreStr = Strings.toString(art.score);
        string memory gridStr = Strings.toString(art.gridSize);
        string memory creatorStr = Strings.toHexString(uint160(art.creator), 20);
        string memory json = string(bytes.concat(
            '{"name":"', bytes(art.name),
            '","description":"', bytes(art.description),
            '","image":"data:image/png;base64,', bytes(art.pixelData),
            '","attributes":[',
            '{"trait_type":"Grid Size","value":"', bytes(gridStr), '"}',
            ',{"trait_type":"Creator","value":"', bytes(creatorStr), '"}',
            ',{"trait_type":"Score","display_type":"number","value":', bytes(scoreStr), "}]}"
        ));
        return string(bytes.concat("data:application/json;base64,", bytes(Base64.encode(bytes(json)))));
    }

    function transferNFT(address to, uint256 id) external nonReentrant {
        require(to != address(0), "Zero address");
        require(msg.sender == _ownerOf(id), "Not owner");
        require(!isTokenListed[id], "Listed");
        _transfer(msg.sender, to, id);
    }

    function _safeSend(address payable to, uint256 amt) internal {
        (bool ok,) = to.call{value: amt}("");
        require(ok, "Send failed");
    }

    function _rmListed(uint256 id) internal {
        uint256 len = listedTokens.length;
        if (len == 0) return;
        uint256 idx = listedIndex[id];
        uint256 last = listedTokens[len - 1];
        if (idx != len - 1) {
            listedTokens[idx] = last;
            listedIndex[last] = idx;
        }
        listedTokens.pop();
        delete listedIndex[id];
    }
}
