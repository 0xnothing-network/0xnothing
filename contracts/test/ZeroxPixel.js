const { expect } = require("chai");
const { ethers } = require("hardhat");

function genPx(seed) {
  const pixels = [];
  for (let i = 0; i < 64; i++) {
    pixels.push(String.fromCharCode((seed * (i + 1)) % 256, ((seed + 100) * (i + 1)) % 256, ((seed + 200) * (i + 1)) % 256, 255));
  }
  return Buffer.from(pixels.join(""), "binary").toString("base64");
}

function getHash(px, grid) {
  return ethers.keccak256(ethers.toBeHex(px, 64 + px.length) + ethers.toBeHex(grid, 32).slice(2)).slice(0, 66);
}

describe("ZeroxPixel", function () {
  let c, dev, u1, u2, u3;

  beforeEach(async () => {
    [dev, u1, u2, u3] = await ethers.getSigners();
    const F = await ethers.getContractFactory("ZeroxPixel");
    c = await F.deploy(dev.address);
    await c.waitForDeployment();
  });

  // Fee Distribution
  it("First sale: seller=creator gets 97.5%, dev gets 2.5%", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(1));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(u1.address))).to.equal(Number(ethers.parseEther("0.975")));
    expect(Number(await c.pendingWithdrawals(dev.address))).to.equal(Number(ethers.parseEther("0.025")));
  });

  it("Resale: creator gets royalty 2.5%, dev gets 2.5%", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(2));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(dev.address))).to.equal(Number(ethers.parseEther("0.025")));
    await c.connect(u1).withdrawPending();
    await c.connect(u2).listForSale(1, ethers.parseEther("1"));
    await c.connect(u1).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(dev.address))).to.equal(Number(ethers.parseEther("0.05")));
    expect(Number(await c.pendingWithdrawals(u1.address))).to.equal(Number(ethers.parseEther("0.025")));
    expect(Number(await c.pendingWithdrawals(u2.address))).to.equal(Number(ethers.parseEther("0.95")));
  });

  it("Seller must withdraw pending", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(3));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(u1.address))).to.equal(Number(ethers.parseEther("0.975")));
    const balBefore = await ethers.provider.getBalance(u1.address);
    await c.connect(u1).withdrawPending();
    const balAfter = await ethers.provider.getBalance(u1.address);
    expect(Number(balAfter) - Number(balBefore)).to.be.closeTo(Number(ethers.parseEther("0.975")), Number(ethers.parseEther("0.001")));
    expect(Number(await c.pendingWithdrawals(u1.address))).to.equal(0);
  });

  it("Cannot self-buy", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(4));
    await c.connect(u1).listForSale(1, ethers.parseEther("0.01"));
    await expect(c.connect(u1).buyNFT(1, { value: ethers.parseEther("0.01") })).to.be.reverted;
  });

  // Marketplace
  it("List and delist", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(10));
    expect(await c.isTokenListed(1)).to.be.false;
    await c.connect(u1).listForSale(1, ethers.parseEther("0.5"));
    expect(await c.isTokenListed(1)).to.be.true;
    await c.connect(u1).delist(1);
    expect(await c.isTokenListed(1)).to.be.false;
  });

  it("Cannot relist", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(11));
    await c.connect(u1).listForSale(1, ethers.parseEther("0.5"));
    await expect(c.connect(u1).listForSale(1, ethers.parseEther("1"))).to.be.reverted;
  });

  it("Cannot buy insufficient", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(12));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await expect(c.connect(u2).buyNFT(1, { value: ethers.parseEther("0.5") })).to.be.reverted;
  });

  it("Price too high rejected", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(13));
    await expect(c.connect(u1).listForSale(1, ethers.parseEther("1001"))).to.be.reverted;
  });

  it("Refund excess", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(14));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    const bal = await ethers.provider.getBalance(u2.address);
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("2") });
    const spent = Number(bal) - Number(await ethers.provider.getBalance(u2.address));
    expect(spent).to.be.closeTo(Number(ethers.parseEther("1")), Number(ethers.parseEther("0.001")));
  });

  // Transfer
  it("Auto-delist on transfer", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(20));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u1).delist(1);
    await c.connect(u1)["transferFrom(address,address,uint256)"](u1.address, u2.address, 1);
    expect(await c.isTokenListed(1)).to.be.false;
  });

  it("transferNFT works", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(21));
    await c.connect(u1).transferNFT(u2.address, 1);
    expect(await c.ownerOf(1)).to.equal(u2.address);
  });

  it("Cannot transfer listed", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(22));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await expect(c.connect(u1).transferNFT(u2.address, 1)).to.be.reverted;
  });

  // Ownership tracking
  it("Owner changes after buyNFT", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(30));
    expect(await c.ownerOf(1)).to.equal(u1.address);
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(await c.ownerOf(1)).to.equal(u2.address);
  });

  it("Owner changes after transferNFT", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(31));
    expect(await c.ownerOf(1)).to.equal(u1.address);
    await c.connect(u1).transferNFT(u2.address, 1);
    expect(await c.ownerOf(1)).to.equal(u2.address);
  });

  it("Multiple transfers ownership correct", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(32));
    await c.connect(u1).transferNFT(u2.address, 1);
    await c.connect(u2).transferNFT(u3.address, 1);
    expect(await c.ownerOf(1)).to.equal(u3.address);
  });

  // Security
  it("Reject duplicate artwork", async () => {
    const px = genPx(40);
    await c.connect(u1).mint("N", "D", 8, px);
    await expect(c.connect(u2).mint("N", "D", 8, px)).to.be.reverted;
  });

  it("Reject large px", async () => {
    await expect(c.connect(u1).mint("N", "D", 8, "x".repeat(50001))).to.be.reverted;
  });

  it("Reject invalid grid", async () => {
    await expect(c.connect(u1).mint("N", "D", 7, genPx(41))).to.be.reverted;
  });

  it("Reject empty name", async () => {
    await expect(c.connect(u1).mint("", "D", 8, genPx(42))).to.be.reverted;
  });

  // Withdrawal
  it("Creator withdraw royalty", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(50));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    await c.connect(u2).listForSale(1, ethers.parseEther("1"));
    await c.connect(u3).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(u1.address))).to.be.greaterThan(0);
    await c.connect(u1).withdrawPending();
    expect(Number(await c.pendingWithdrawals(u1.address))).to.equal(0);
  });

  it("Dev withdraw", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(51));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(Number(await c.pendingWithdrawals(dev.address))).to.equal(Number(ethers.parseEther("0.025")));
    await c.connect(dev).withdrawPending();
    expect(Number(await c.pendingWithdrawals(dev.address))).to.equal(0);
  });

  it("Cannot withdraw zero", async () => {
    await expect(c.connect(u1).withdrawPending()).to.be.reverted;
  });

  // Score
  it("Score increases on each sale", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(60));
    expect(await c.getScore(1)).to.equal(0);
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(await c.getScore(1)).to.equal(1);
    await c.connect(u2).listForSale(1, ethers.parseEther("1"));
    await c.connect(u3).buyNFT(1, { value: ethers.parseEther("1") });
    expect(await c.getScore(1)).to.equal(2);
  });

  // TokenURI
  it("TokenURI valid JSON", async () => {
    await c.connect(u1).mint("TestNFT", "My Art", 8, genPx(70));
    const uri = await c.tokenURI(1);
    expect(uri.startsWith("data:application/json;base64,")).to.be.true;
    const json = Buffer.from(uri.split(",")[1], "base64").toString();
    const p = JSON.parse(json);
    expect(p.name).to.equal("TestNFT");
    expect(p.description).to.equal("My Art");
    expect(p.attributes.length).to.equal(3);
    expect(p.attributes[2].display_type).to.equal("number");
  });

  // Artwork Registry
  it("checkOriginal works", async () => {
    const px = genPx(80);
    expect(await c.checkOriginal(px, 8)).to.be.true;
    await c.connect(u1).mint("N", "D", 8, px);
    expect(await c.checkOriginal(px, 8)).to.be.false;
  });

  it("getCreator works", async () => {
    const px = genPx(90);
    await c.connect(u1).mint("N", "D", 8, px);
    expect(await c.getCreator(px, 8)).to.equal(u1.address);
  });

  // EIP-2981
  it("Royalty info", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(110));
    const [recv, amt] = await c.royaltyInfo(1, ethers.parseEther("1"));
    expect(recv).to.equal(u1.address);
    expect(amt).to.equal(ethers.parseEther("0.025"));
  });

  it("supportsInterface EIP-2981", async () => {
    expect(await c.supportsInterface("0x2a55205a")).to.be.true;
  });

  it("supportsInterface ERC165", async () => {
    expect(await c.supportsInterface("0x01ffc9a7")).to.be.true;
  });

  // Listed tokens tracking
  it("Listed tokens removed on delist", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(120));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    expect(await c.isTokenListed(1)).to.be.true;
    await c.connect(u1).delist(1);
    expect(await c.isTokenListed(1)).to.be.false;
  });

  // CEI pattern
  it("State updated before transfer", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(130));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(await c.ownerOf(1)).to.equal(u2.address);
    expect(await c.isTokenListed(1)).to.be.false;
    expect(await c.getScore(1)).to.equal(1);
  });

  it("Listed tokens removed on buyNFT", async () => {
    await c.connect(u1).mint("N", "D", 8, genPx(140));
    await c.connect(u1).listForSale(1, ethers.parseEther("1"));
    expect(await c.isTokenListed(1)).to.be.true;
    await c.connect(u2).buyNFT(1, { value: ethers.parseEther("1") });
    expect(await c.isTokenListed(1)).to.be.false;
  });
});
