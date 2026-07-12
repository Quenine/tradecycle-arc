import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("CycleTokenMarketplaceV2", function () {
  async function deployFundedCycleFixture() {
    const [owner, operator, seller, buyer, verifier, reserve, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);
    const marketplace = await ethers.deployContract("CycleTokenMarketplaceV2", [
      await usdc.getAddress(),
      treasury.address,
    ]);

    const capital = ethers.parseEther("1000");
    const collateral = ethers.parseEther("100");
    const repayAmount = ethers.parseEther("1200");

    await usdc.mint(operator.address, ethers.parseEther("5000"));
    await usdc.mint(seller.address, ethers.parseEther("5000"));
    await usdc.mint(buyer.address, ethers.parseEther("5000"));
    await usdc.mint(verifier.address, ethers.parseEther("100"));

    await usdc.connect(operator).approve(await vault.getAddress(), collateral);
    await vault.connect(operator).depositCollateral(collateral);

    const cycle = await ethers.deployContract("ProductionCycle", [
      operator.address,
      await usdc.getAddress(),
      capital,
      collateral,
      ethers.parseEther("1200"),
      30 * 24 * 60 * 60,
      1,
      1,
      reserve.address,
      treasury.address,
      await verifierRegistry.getAddress(),
      await vault.getAddress(),
      ethers.ZeroAddress,
      "Rice Cycle",
      "RICE",
      "Agricultural",
      "Lagos",
      "Secondary market test cycle",
    ]);

    await verifierRegistry.setQuorum(1);
    await usdc.connect(verifier).approve(await verifierRegistry.getAddress(), ethers.parseEther("10"));
    await verifierRegistry.connect(verifier).registerVerifier(ethers.parseEther("10"));

    await usdc.connect(seller).approve(await cycle.getAddress(), capital);
    await cycle.connect(seller).invest(capital);

    const token = await ethers.getContractAt("CycleShareToken", await cycle.cycleToken());

    return {
      operator,
      seller,
      buyer,
      verifier,
      reserve,
      treasury,
      usdc,
      cycle,
      token,
      marketplace,
      capital,
      repayAmount,
      verifierRegistry,
    };
  }

  async function completeCycle(fixture: Awaited<ReturnType<typeof deployFundedCycleFixture>>) {
    const { operator, verifier, usdc, cycle, repayAmount, verifierRegistry } = fixture;

    for (const milestoneId of [0, 1, 2, 3]) {
      await cycle.connect(operator).submitMilestoneEvidence(milestoneId, `ipfs://milestone-${milestoneId}`);
      await verifierRegistry.connect(verifier).approveMilestone(await cycle.getAddress(), milestoneId);
      await cycle.connect(operator).releaseMilestone(milestoneId);
    }

    await cycle.connect(operator).submitHarvestEvidence("ipfs://harvest-proof");
    await verifierRegistry.connect(verifier).approveMilestone(await cycle.getAddress(), 99);
    await cycle.connect(operator).submitHarvest();
    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);
  }

  it("lets a buyer fill an order and later withdraw the profit-bearing claim", async function () {
    const fixture = await deployFundedCycleFixture();
    const { seller, buyer, treasury, usdc, cycle, token, marketplace } = fixture;
    const marketplaceAddress = await marketplace.getAddress();
    const tokenAddress = await token.getAddress();

    const listedAmount = ethers.parseEther("400");
    const pricePerToken = ethers.parseEther("1");

    await token.connect(seller).approve(marketplaceAddress, listedAmount);
    await marketplace.connect(seller).createSellOrder(tokenAddress, listedAmount, pricePerToken);

    const buyerBeforeTrade = await usdc.balanceOf(buyer.address);
    const sellerBeforeTrade = await usdc.balanceOf(seller.address);
    const treasuryBeforeTrade = await usdc.balanceOf(treasury.address);

    await usdc.connect(buyer).approve(marketplaceAddress, ethers.parseEther("400"));
    await marketplace.connect(buyer).buyOrderFull(0);

    expect(await token.balanceOf(buyer.address)).to.equal(listedAmount);
    expect(await token.balanceOf(seller.address)).to.equal(ethers.parseEther("600"));
    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBeforeTrade - ethers.parseEther("400"));
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBeforeTrade + ethers.parseEther("398"));
    expect(await usdc.balanceOf(treasury.address)).to.equal(treasuryBeforeTrade + ethers.parseEther("2"));

    await completeCycle(fixture);

    const buyerBeforeWithdraw = await usdc.balanceOf(buyer.address);
    const sellerBeforeWithdraw = await usdc.balanceOf(seller.address);

    await cycle.connect(buyer).withdraw();
    await cycle.connect(seller).withdraw();

    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBeforeWithdraw + ethers.parseEther("478"));
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBeforeWithdraw + ethers.parseEther("717"));
  });

  it("returns escrowed tokens so the seller can redeem after distribution if an order never fills", async function () {
    const fixture = await deployFundedCycleFixture();
    const { seller, usdc, cycle, token, marketplace } = fixture;
    const marketplaceAddress = await marketplace.getAddress();
    const tokenAddress = await token.getAddress();

    await token.connect(seller).approve(marketplaceAddress, ethers.parseEther("250"));
    await marketplace.connect(seller).createSellOrder(tokenAddress, ethers.parseEther("250"), ethers.parseEther("1"));

    await completeCycle(fixture);

    await marketplace.connect(seller).cancelOrder(0);
    expect(await token.balanceOf(seller.address)).to.equal(ethers.parseEther("1000"));

    const sellerBeforeWithdraw = await usdc.balanceOf(seller.address);
    await cycle.connect(seller).withdraw();
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBeforeWithdraw + ethers.parseEther("1195"));
  });

  it("reports the buyer cost as the gross amount with the fee deducted from seller proceeds", async function () {
    const { seller, token, marketplace } = await deployFundedCycleFixture();
    const marketplaceAddress = await marketplace.getAddress();
    const tokenAddress = await token.getAddress();

    await token.connect(seller).approve(marketplaceAddress, ethers.parseEther("100"));
    await marketplace.connect(seller).createSellOrder(tokenAddress, ethers.parseEther("100"), ethers.parseEther("1"));

    const [gross, fee, total] = await marketplace.orderCost(0, ethers.parseEther("100"));
    expect(gross).to.equal(ethers.parseEther("100"));
    expect(fee).to.equal(ethers.parseEther("0.5"));
    expect(total).to.equal(ethers.parseEther("100"));
  });
  it("supports partial fills, tracks the remainder, and closes after the final fill", async function () {
    const { seller, buyer, treasury, usdc, token, marketplace } = await deployFundedCycleFixture();
    const market = await marketplace.getAddress();
    const tokenAddress = await token.getAddress();
    await token.connect(seller).approve(market, ethers.parseEther("300"));
    await marketplace.connect(seller).createSellOrder(tokenAddress, ethers.parseEther("300"), ethers.parseEther("1"));
    await usdc.connect(buyer).approve(market, ethers.parseEther("300"));

    const sellerBefore = await usdc.balanceOf(seller.address);
    const treasuryBefore = await usdc.balanceOf(treasury.address);
    await marketplace.connect(buyer).buyOrder(0, ethers.parseEther("100"));
    let order = await marketplace.orders(0);
    expect(order.amount).to.equal(ethers.parseEther("200"));
    expect(order.active).to.equal(true);
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("100"));
    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + ethers.parseEther("99.5"));
    expect(await usdc.balanceOf(treasury.address)).to.equal(treasuryBefore + ethers.parseEther("0.5"));

    await marketplace.connect(buyer).buyOrder(0, ethers.parseEther("200"));
    order = await marketplace.orders(0);
    expect(order.amount).to.equal(0n);
    expect(order.active).to.equal(false);
    await expect(marketplace.connect(buyer).buyOrder(0, 1n)).to.be.revertedWith("Order inactive");
  });

  it("rejects zero-value listings, prices, and fills", async function () {
    const { seller, buyer, usdc, token, marketplace } = await deployFundedCycleFixture();
    const market = await marketplace.getAddress();
    const tokenAddress = await token.getAddress();
    await expect(marketplace.connect(seller).createSellOrder(tokenAddress, 0n, 1n)).to.be.revertedWith("Invalid amount");
    await expect(marketplace.connect(seller).createSellOrder(tokenAddress, 1n, 0n)).to.be.revertedWith("Invalid price");
    await token.connect(seller).approve(market, ethers.parseEther("10"));
    await marketplace.connect(seller).createSellOrder(tokenAddress, ethers.parseEther("10"), ethers.parseEther("1"));
    await usdc.connect(buyer).approve(market, ethers.parseEther("10"));
    await expect(marketplace.connect(buyer).buyOrder(0, 0n)).to.be.revertedWith("Zero fill");
  });
});
