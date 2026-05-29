# 0xPixel Smart Contract Documentation

## Overview

**0xPixel** là smart contract NFT marketplace cho pixel art trên blockchain, lưu trữ 100% on-chain với các tính năng:

- Mint pixel art với grid 8x8, 16x16, 32x32, 64x64, 128x128
- Marketplace với fee 5%
- Creator royalty cho resale
- EIP-2981 royalty standard
- Score system

---

## Contract Information

| Thông số | Giá trị |
|----------|---------|
| Tên | 0xPixel |
| Symbol | 0xP |
| Solidity | 0.8.28 |
| EVM | Cancun |
| Token Standard | ERC721 + EIP-2981 |
| License | MIT |

---

## Contract Addresses (Update after deploy)

```
Mainnet: TODO_UPDATE_AFTER_DEPLOY
Testnet: TODO_UPDATE_AFTER_DEPLOY
```

---

## Constructor

```
ZeroxPixel(admin, devWallet)
```

| Tham số | Mô tả |
|---------|--------|
| `admin` | Địa chỉ admin, có quyền withdraw ETH từ contract |
| `devWallet` | Địa chỉ nhận dev fee 2.5% |

---

## Fee Structure

```
Tổng fee khi bán NFT = 5% của giá bán

├── Dev Fee: 2.5% → devWallet (pending withdrawal)
└── Creator Royalty: 2.5% → creator gốc (pending withdrawal)
    (CHỈ khi resale - seller != creator)

Seller nhận: 95% (chuyển thẳng)
```

### Ví dụ bán NFT giá 1 ETH:

**Lần đầu bán (seller = creator):**
```
Buyer trả: 1 ETH
Seller nhận: 0.95 ETH (95%)
Dev nhận: 0.025 ETH (2.5%) → pending
Creator nhận: 0 ETH (vì seller = creator)
```

**Resale (seller ≠ creator):**
```
Buyer trả: 1 ETH
Seller nhận: 0.95 ETH (95%)
Dev nhận: 0.025 ETH (2.5%) → pending
Creator nhận: 0.025 ETH (2.5%) → pending
```

---

## Functions

### Write Functions

#### `mint(name, description, gridSize, pixelData) → uint256`
Mint một pixel NFT mới.

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `name` | string | Tên NFT (1-32 ký tự) |
| `description` | string | Mô tả (max 256 ký tự) |
| `gridSize` | uint256 | Grid size: 8, 16, 32, 64, 128 |
| `pixelData` | string | Base64 encoded PNG (max 50KB) |

**Requires:**
- name: 1-32 ký tự
- description: max 256 ký tự
- gridSize: phải là 8, 16, 32, 64, hoặc 128
- pixelData: 1-50,000 ký tự
- Artwork chưa tồn tại (hash check)

**Events:** `PixelArtMinted(minter, tokenId, name)`

---

#### `listForSale(tokenId, priceInWei)`
List NFT để bán.

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `tokenId` | uint256 | Token ID |
| `priceInWei` | uint256 | Giá bán tính bằng wei |

**Requires:**
- msg.sender = owner của token
- NFT chưa được list
- priceInWei > 0

**Events:** `NFTListed(tokenId, price)`

---

#### `delist(tokenId)`
Delist NFT đang bán.

**Requires:**
- msg.sender = owner của token
- NFT đang được list

**Events:** `NFTDelisted(tokenId)`

---

#### `buyNFT(tokenId) payable`
Mua NFT đang được bán.

**Requires:**
- NFT đang được list
- msg.value >= giá bán
- msg.sender ≠ seller (chống self-buy)

**Logic:**
1. Tính dev fee (2.5%)
2. Nếu seller ≠ creator: tính creator royalty (2.5%)
3. CEI Pattern: clear state trước external calls
4. Transfer NFT cho buyer
5. Cộng fees vào pending withdrawals
6. Chuyển tiền cho seller
7. Refund nếu trả dư

**Events:** `NFTBought(tokenId, buyer, seller, price)`

---

#### `transferNFT(to, tokenId)`
Transfer NFT (thay thế ERC721 transfer).

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `to` | address | Địa chỉ nhận |
| `tokenId` | uint256 | Token ID |

**Requires:**
- to ≠ address(0)
- msg.sender = owner
- NFT không đang được list

**Note:** Auto-delist khi transfer (qua `_update` hook)

---

#### `withdraw()`
Admin rút toàn bộ ETH trong contract.

**Requires:** msg.sender = admin

---

#### `withdrawPending()`
Rút số dư pending của msg.sender.

**Requires:** pendingWithdrawals[msg.sender] > 0

**Events:** `Withdrawn(recipient, amount)`

---

### Read Functions

#### `royaltyInfo(tokenId, salePrice) → (address, uint256)`
EIP-2981: Lấy thông tin royalty.

| Tham số | Kiểu | Mô tả |
|---------|------|--------|
| `tokenId` | uint256 | Token ID |
| `salePrice` | uint256 | Giá bán |

**Returns:**
- receiver: địa chỉ creator gốc
- royaltyAmount: 2.5% của salePrice

---

#### `getTokenScore(tokenId) → uint256`
Lấy score của NFT.

Score tăng +1 mỗi lần được bán qua `buyNFT()`.

---

#### `getPendingBalance(account) → uint256`
Lấy số dư pending của một địa chỉ.

---

#### `getPrice(tokenId) → uint256`
Lấy giá của NFT (0 = không bán).

---

#### `getNFTsForSale() → uint256[]`
Lấy danh sách token IDs đang bán.

---

#### `getListedTokensCount() → uint256`
Đếm số NFT đang bán.

---

#### `getMintedTokens(owner) → uint256[]`
Lấy danh sách NFT của một địa chỉ.

---

#### `getTokenData(tokenId) → PixelArt`
Lấy toàn bộ thông tin NFT.

**Returns PixelArt struct:**
```solidity
struct PixelArt {
    string name;
    string description;
    uint256 gridSize;
    string pixelData;      // base64 PNG
    uint256 price;
    address creator;       // người mint gốc
    uint256 mintedAt;
    bytes32 artworkHash;
    uint256 score;
}
```

---

#### `tokenURI(tokenId) → string`
Lấy metadata URI (chuẩn ERC721).

**Returns JSON:**
```json
{
  "name": "NFT Name",
  "description": "NFT Description",
  "image": "data:image/png;base64,...",
  "attributes": [
    {"trait_type": "Grid Size", "value": "16"},
    {"trait_type": "Creator", "value": "0x..."},
    {"trait_type": "Minted At", "value": "1234567890"},
    {"trait_type": "Score", "value": 5}
  ]
}
```

---

#### `checkOriginality(pixelData, gridSize) → bool`
Kiểm tra artwork đã tồn tại chưa.

---

#### `getOriginalCreator(pixelData, gridSize) → address`
Lấy creator gốc của artwork.

---

#### `isOriginal(artworkHash) → bool`
Kiểm tra hash đã tồn tại chưa.

---

#### `supportsInterface(interfaceId) → bool`
Kiểm tra interface được hỗ trợ.

Hỗ trợ: ERC721, IERC2981

---

## Constants

```solidity
CREATOR_ROYALTY_BPS = 250    // 2.5% in basis points
DEV_FEE_BPS = 250            // 2.5% in basis points
MAX_PIXEL_DATA_SIZE = 50000  // 50KB max
BPS_DENOMINATOR = 10000      // basis points denominator
```

---

## Events

| Event | Các tham số |
|-------|-------------|
| `PixelArtMinted` | minter, tokenId, name |
| `NFTListed` | tokenId, price |
| `NFTDelisted` | tokenId |
| `NFTBought` | tokenId, buyer, seller, price |
| `Withdrawn` | recipient, amount |

---

## Security Features

| Tính năng | Mô tả |
|-----------|--------|
| **CEI Pattern** | State updates trước external calls |
| **NonReentrant** | ReentrancyGuard trên mint, buyNFT, withdrawPending |
| **Self-buy prevention** | Không cho tự mua NFT của mình |
| **Auto-delist** | NFT tự delist khi transfer |
| **Ownership sync** | `_update` hook đồng bộ userTokens |
| **Size limit** | pixelData max 50KB |
| **Duplicate check** | Hash kiểm tra artwork trùng |
| **Pull payment** | Creator/dev tự rút tiền |

---

## Gas Optimization

| Kỹ thuật | Mô tả |
|---------|--------|
| O(1) listed removal | Dùng `listedIndex` mapping |
| Unused code removal | Không có ranking functions |
| Event optimization | Minimal events |
| Size limits | Prevents DoS via large data |

---

## Deployment

### Prerequisites

1. Cài đặt dependencies:
```bash
npm install
```

2. Cấu hình `.env`:
```env
ADMIN_ADDRESS=0x...    # Địa chỉ admin
DEV_WALLET_ADDRESS=0x... # Địa chỉ dev wallet
PRIVATE_KEY=0x...       # Private key để deploy
MAINNET_RPC_URL=...     # RPC URL
ETHERSCAN_API_KEY=...   # Etherscan API key để verify
```

### Deploy

```bash
# Compile
npx hardhat compile

# Deploy to localhost
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

### Verify

```bash
npx hardhat run scripts/verify.ts --network mainnet
```

---

## Testing

```bash
# Chạy tất cả tests
npx hardhat test

# Chạy với coverage
npx hardhat coverage
```

### Test Categories

- Fee Distribution
- Marketplace
- Transfer
- Security
- Withdrawal
- Score
- TokenURI
- EIP-2981
- Edge Cases

---

## Frontend Integration

### ABI

ABI nằm trong `frontend/lib/abi.ts`

### Contract Config

```typescript
// frontend/lib/contract.ts
export const CONTRACT_ADDRESS = "TODO_UPDATE_AFTER_DEPLOY";
```

### Important Functions

```typescript
// Mint
await contract.mint(name, description, gridSize, pixelData);

// List for sale
await contract.listForSale(tokenId, price);

// Buy
await contract.buyNFT(tokenId, { value: price });

// Withdraw pending
await contract.withdrawPending();

// Get royalty info (EIP-2981)
const [receiver, amount] = await contract.royaltyInfo(tokenId, salePrice);
```

---

## OpenSea / Marketplace Integration

Contract hỗ trợ **EIP-2981** nên:

1. **OpenSea** sẽ tự động hiển thị creator royalty
2. **Blur**, **X2Y2**, và các marketplace khác hỗ trợ EIP-2981 cũng sẽ hoạt động
3. Creator nhận royalty trực tiếp từ marketplace

**Lưu ý:** Khi bán qua OpenSea:
- NFT được transfer qua OpenSea (không qua `buyNFT()`)
- Score trên contract **không tăng**
- Creator vẫn nhận royalty qua EIP-2981

---

## Common Issues

### 1. "Insufficient payment"
Người mua không trả đủ tiền. Kiểm tra `msg.value >= price`.

### 2. "Not your token"
Người gọi không sở hữu NFT đó.

### 3. "Already listed"
NFT đã được list trước đó. Delist trước khi list lại.

### 4. "Cannot transfer listed NFT"
Không thể transfer NFT đang được bán. Delist trước.

### 5. "Cannot buy own NFT"
Không thể tự mua NFT của mình.

### 6. "Artwork already minted"
Artwork đã tồn tại trên contract.

---

## Version History

### v1.0.0 (Current)
- Mint pixel NFT với grid sizes: 8, 16, 32, 64, 128
- Marketplace với fee 5%
- Creator royalty 2.5% cho resale
- Dev fee 2.5%
- Pull payment system
- EIP-2981 royalty standard
- CEI pattern security
- Auto-delist on transfer
- On-chain storage (100%)

---

## License

MIT License - Xem file `LICENSE`
