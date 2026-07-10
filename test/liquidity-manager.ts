import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("LiquidityManager", function () {
  it("lets the owner retry DEX liquidity after a funding-time config miss", async function () {
    const [owner, operator, investor, reserve, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("LiquidityVault", [await usdc.getAddress()]);
    const manager = await ethers.deployContract("LiquidityManager", [await usdc.getAddress()]);
    const dexFactory = await ethers.deployContract("MockDexFactory");
    const dexRouter = await ethers.deployContract("MockDexRouter");

    await manager.setFactory(owner.address);
    await manager.setVault(await vault.getAddress());
    await vault.setLiquidityManager(await manager.getAddress());

    const capital = ethers.parseEther("1000");
    await usdc.mint(await vault.getAddress(), ethers.parseEther("40"));
    await usdc.mint(investor.address, capital);

    const cycle = await ethers.deployContract("ProductionCycle", [
      operator.address,
      await usdc.getAddress(),
      capital,
      ethers.parseEther("100"),
      ethers.parseEther("1200"),
      30 * 24 * 60 * 60,
      1,
      1,
      reserve.address,
      treasury.address,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      await manager.getAddress(),
      "Liquidity Cycle",
      "LIQ",
      "Agricultural",
      "Lagos",
      "Liquidity retry test cycle",
    ]);

    await manager.registerCycle(await cycle.getAddress(), capital);

    const cfgAfterSeed = await manager.launches(await cycle.getAddress());
    expect(cfgAfterSeed.invested).to.equal(true);
    expect(cfgAfterSeed.launched).to.equal(false);

    await usdc.connect(investor).approve(await cycle.getAddress(), ethers.parseEther("980"));
    await cycle.connect(investor).invest(ethers.parseEther("980"));

    const cfgAfterFunding = await manager.launches(await cycle.getAddress());
    expect(await cycle.state()).to.equal(1);
    expect(cfgAfterFunding.launched).to.equal(false);

    await manager.setDex(await dexFactory.getAddress(), await dexRouter.getAddress());
    await expect(manager.retryLiquidityLaunch(await cycle.getAddress()))
      .to.emit(manager, "LiquidityLaunched");

    const cfgAfterRetry = await manager.launches(await cycle.getAddress());
    const token = await cycle.cycleToken();
    const cycleToken = await ethers.getContractAt("CycleShareToken", token);
    expect(cfgAfterRetry.launched).to.equal(true);
    expect(await usdc.balanceOf(await dexRouter.getAddress())).to.equal(ethers.parseEther("20"));
    expect(await cycleToken.balanceOf(await dexRouter.getAddress())).to.equal(ethers.parseEther("20"));
  });
});
