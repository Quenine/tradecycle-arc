import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("ProductionCycle settlement flows", function () {
  async function deployFixture(registerTrustedCycle: boolean) {
    const [owner, operator, investor, verifier, reserve, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);
    const mockFactory = await ethers.deployContract("MockCycleFactory");

    const capital = ethers.parseEther("1000");
    const collateral = ethers.parseEther("100");
    const repayAmount = ethers.parseEther("1200");

    await usdc.mint(operator.address, ethers.parseEther("5000"));
    await usdc.mint(investor.address, ethers.parseEther("5000"));
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
      "Settlement test cycle",
    ]);

    if (registerTrustedCycle) {
      await vault.registerTrustedCycle(await cycle.getAddress(), true);
    }

    await mockFactory.setCycles([await cycle.getAddress()]);
    await verifierRegistry.setFactory(await mockFactory.getAddress());
    await verifierRegistry.setQuorum(1);
    await usdc.connect(verifier).approve(await verifierRegistry.getAddress(), ethers.parseEther("10"));
    await verifierRegistry.connect(verifier).registerVerifier(ethers.parseEther("10"));

    await usdc.connect(investor).approve(await cycle.getAddress(), capital);
    await cycle.connect(investor).invest(capital);

    for (const milestoneId of [0, 1, 2, 3]) {
      await cycle.connect(operator).submitMilestoneEvidence(milestoneId, `ipfs://milestone-${milestoneId}`);
      await verifierRegistry.connect(verifier).approveMilestone(await cycle.getAddress(), milestoneId);
      await cycle.connect(operator).releaseMilestone(milestoneId);
    }

    await cycle.connect(operator).submitHarvestEvidence("ipfs://harvest-proof");
    await verifierRegistry.connect(verifier).approveMilestone(await cycle.getAddress(), 99);
    await cycle.connect(operator).submitHarvest();

    return {
      owner,
      operator,
      investor,
      verifier,
      reserve,
      treasury,
      usdc,
      vault,
      cycle,
      capital,
      collateral,
      repayAmount,
      verifierRegistry,
    };
  }

  it("lets investors withdraw after distribute and auto-refunds collateral when trusted", async function () {
    const { operator, investor, reserve, treasury, usdc, vault, cycle, collateral, repayAmount } =
      await deployFixture(true);

    const operatorBalanceBefore = await usdc.balanceOf(operator.address);
    const investorBalanceBefore = await usdc.balanceOf(investor.address);

    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);

    expect(await cycle.state()).to.equal(3);
    expect(await vault.collateralBalance(operator.address)).to.equal(0);
    expect(await usdc.balanceOf(operator.address)).to.equal(operatorBalanceBefore - repayAmount + collateral);

    expect(await usdc.balanceOf(reserve.address)).to.equal(ethers.parseEther("2"));
    expect(await usdc.balanceOf(treasury.address)).to.equal(ethers.parseEther("2"));

    await cycle.connect(investor).withdraw();

    expect(await usdc.balanceOf(investor.address)).to.equal(investorBalanceBefore + ethers.parseEther("1195"));
  });

  it("does not allow harvest submission before all milestones are released", async function () {
    const [owner, operator, investor, verifier] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);
    const mockFactory = await ethers.deployContract("MockCycleFactory");

    const cycle = await ethers.deployContract("ProductionCycle", [
      operator.address,
      await usdc.getAddress(),
      ethers.parseEther("1000"),
      ethers.parseEther("100"),
      ethers.parseEther("1200"),
      30 * 24 * 60 * 60,
      1,
      1,
      owner.address,
      owner.address,
      await verifierRegistry.getAddress(),
      await vault.getAddress(),
      ethers.ZeroAddress,
      "Rice Cycle",
      "RICE",
      "Agricultural",
      "Lagos",
      "Settlement test cycle",
    ]);

    await verifierRegistry.setQuorum(1);
    await usdc.mint(investor.address, ethers.parseEther("2000"));
    await usdc.mint(verifier.address, ethers.parseEther("100"));
    await usdc.connect(investor).approve(await cycle.getAddress(), ethers.parseEther("1000"));
    await cycle.connect(investor).invest(ethers.parseEther("1000"));
    await usdc.connect(verifier).approve(await verifierRegistry.getAddress(), ethers.parseEther("10"));
    await verifierRegistry.connect(verifier).registerVerifier(ethers.parseEther("10"));

    await cycle.connect(operator).submitHarvestEvidence("ipfs://harvest-proof");
    await verifierRegistry.connect(verifier).approveMilestone(await cycle.getAddress(), 99);

    await expect(cycle.connect(operator).submitHarvest()).to.be.revertedWithCustomError(cycle, "InvalidState");
  });

  it("keeps collateral manually withdrawable if auto-refund cannot run", async function () {
    const { operator, usdc, vault, cycle, collateral, repayAmount } = await deployFixture(false);

    const operatorBalanceBefore = await usdc.balanceOf(operator.address);

    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);

    expect(await cycle.state()).to.equal(3);
    expect(await vault.collateralBalance(operator.address)).to.equal(collateral);
    expect(await usdc.balanceOf(operator.address)).to.equal(operatorBalanceBefore - repayAmount);

    await vault.connect(operator).withdrawCollateral(collateral);

    expect(await vault.collateralBalance(operator.address)).to.equal(0);
    expect(await usdc.balanceOf(operator.address)).to.equal(operatorBalanceBefore - repayAmount + collateral);
  });

  it("requires the operator to repay the exact expected cycle revenue", async function () {
    const { operator, usdc, cycle, repayAmount } = await deployFixture(true);

    const tooLow = repayAmount - ethers.parseEther("1");
    const tooHigh = repayAmount + ethers.parseEther("1");

    await usdc.connect(operator).approve(await cycle.getAddress(), tooLow);
    await expect(cycle.connect(operator).repayAndDistribute(tooLow)).to.be.revertedWithCustomError(cycle, "InvalidRepay");

    await usdc.connect(operator).approve(await cycle.getAddress(), tooHigh);
    await expect(cycle.connect(operator).repayAndDistribute(tooHigh)).to.be.revertedWithCustomError(cycle, "InvalidRepay");

    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);

    expect(await cycle.state()).to.equal(3);
  });

  it("blocks unstake while a verifier is attached to an unfinished cycle", async function () {
    const { verifier, verifierRegistry } = await deployFixture(true);

    await expect(verifierRegistry.connect(verifier).unstake()).to.be.revertedWith("!active-cycle");
  });

  it("applies reserve compensation to a defaulted cycle recovery pool", async function () {
    const [owner, operator, investorA, investorB, verifier, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const reservePool = await ethers.deployContract("ReservePool", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);

    const capital = ethers.parseEther("1000");
    const collateral = ethers.parseEther("100");

    await usdc.mint(operator.address, ethers.parseEther("500"));
    await usdc.mint(investorA.address, ethers.parseEther("500"));
    await usdc.mint(investorB.address, ethers.parseEther("500"));
    await usdc.mint(owner.address, ethers.parseEther("300"));

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
      await reservePool.getAddress(),
      treasury.address,
      await verifierRegistry.getAddress(),
      await vault.getAddress(),
      ethers.ZeroAddress,
      "Rice Cycle",
      "RICE",
      "Agricultural",
      "Lagos",
      "Default test cycle",
    ]);

    await vault.registerTrustedCycle(await cycle.getAddress(), true);
    await usdc.connect(investorA).approve(await cycle.getAddress(), ethers.parseEther("500"));
    await cycle.connect(investorA).invest(ethers.parseEther("500"));
    await usdc.connect(investorB).approve(await cycle.getAddress(), ethers.parseEther("500"));
    await cycle.connect(investorB).invest(ethers.parseEther("500"));

    await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);
    await cycle.triggerDefault();

    await usdc.connect(owner).approve(await reservePool.getAddress(), ethers.parseEther("300"));
    await reservePool.addReserves(ethers.parseEther("300"));
    await reservePool.compensate(await cycle.getAddress(), ethers.parseEther("300"));

    const beforeA = await usdc.balanceOf(investorA.address);
    const beforeB = await usdc.balanceOf(investorB.address);

    await cycle.connect(investorA).withdrawAfterDefault();
    await cycle.connect(investorB).withdrawAfterDefault();

    expect(await usdc.balanceOf(investorA.address)).to.equal(beforeA + ethers.parseEther("700"));
    expect(await usdc.balanceOf(investorB.address)).to.equal(beforeB + ethers.parseEther("700"));
  });

  it("splits verifier rewards proportionally to stake", async function () {
    const [owner, operator, investor, verifierA, verifierB, reserve, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);
    const mockFactory = await ethers.deployContract("MockCycleFactory");

    const capital = ethers.parseEther("1000");
    const collateral = ethers.parseEther("100");
    const repayAmount = ethers.parseEther("1200");

    await usdc.mint(operator.address, ethers.parseEther("5000"));
    await usdc.mint(investor.address, ethers.parseEther("5000"));
    await usdc.mint(verifierA.address, ethers.parseEther("100"));
    await usdc.mint(verifierB.address, ethers.parseEther("100"));

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
      "Settlement test cycle",
    ]);

    await vault.registerTrustedCycle(await cycle.getAddress(), true);
    await mockFactory.setCycles([await cycle.getAddress()]);
    await verifierRegistry.setFactory(await mockFactory.getAddress());
    await verifierRegistry.setQuorum(1);

    await usdc.connect(verifierA).approve(await verifierRegistry.getAddress(), ethers.parseEther("10"));
    await verifierRegistry.connect(verifierA).registerVerifier(ethers.parseEther("10"));
    await usdc.connect(verifierB).approve(await verifierRegistry.getAddress(), ethers.parseEther("30"));
    await verifierRegistry.connect(verifierB).registerVerifier(ethers.parseEther("30"));

    await usdc.connect(investor).approve(await cycle.getAddress(), capital);
    await cycle.connect(investor).invest(capital);

    for (const milestoneId of [0, 1, 2, 3]) {
      await cycle.connect(operator).submitMilestoneEvidence(milestoneId, `ipfs://milestone-${milestoneId}`);
      await verifierRegistry.connect(verifierA).approveMilestone(await cycle.getAddress(), milestoneId);
      if (milestoneId === 0) {
        await verifierRegistry.connect(verifierB).approveMilestone(await cycle.getAddress(), milestoneId);
      }
      await cycle.connect(operator).releaseMilestone(milestoneId);
    }

    await cycle.connect(operator).submitHarvestEvidence("ipfs://harvest-proof");
    await verifierRegistry.connect(verifierA).approveMilestone(await cycle.getAddress(), 99);
    await cycle.connect(operator).submitHarvest();

    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);

    const verifierAInfo = await verifierRegistry.verifiers(verifierA.address);
    const verifierBInfo = await verifierRegistry.verifiers(verifierB.address);

    expect(verifierAInfo.pendingReward).to.equal(ethers.parseEther("0.25"));
    expect(verifierBInfo.pendingReward).to.equal(ethers.parseEther("0.75"));
  });

  it("excludes active verifiers who did not verify the cycle from its rewards", async function () {
    const [owner, operator, investor, verifierA, verifierB, reserve, treasury] = await ethers.getSigners();

    const usdc = await ethers.deployContract("MockUSDC");
    const vault = await ethers.deployContract("CollateralVault", [await usdc.getAddress()]);
    const verifierRegistry = await ethers.deployContract("VerifierRegistry", [
      await usdc.getAddress(),
      ethers.parseEther("10"),
    ]);
    const mockFactory = await ethers.deployContract("MockCycleFactory");

    const capital = ethers.parseEther("1000");
    const collateral = ethers.parseEther("100");
    const repayAmount = ethers.parseEther("1200");

    await usdc.mint(operator.address, ethers.parseEther("5000"));
    await usdc.mint(investor.address, ethers.parseEther("5000"));
    await usdc.mint(verifierA.address, ethers.parseEther("100"));
    await usdc.mint(verifierB.address, ethers.parseEther("100"));

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
      "Settlement test cycle",
    ]);

    await vault.registerTrustedCycle(await cycle.getAddress(), true);
    await mockFactory.setCycles([await cycle.getAddress()]);
    await verifierRegistry.setFactory(await mockFactory.getAddress());
    await verifierRegistry.setQuorum(1);

    await usdc.connect(verifierA).approve(await verifierRegistry.getAddress(), ethers.parseEther("10"));
    await verifierRegistry.connect(verifierA).registerVerifier(ethers.parseEther("10"));
    await usdc.connect(verifierB).approve(await verifierRegistry.getAddress(), ethers.parseEther("30"));
    await verifierRegistry.connect(verifierB).registerVerifier(ethers.parseEther("30"));

    await usdc.connect(investor).approve(await cycle.getAddress(), capital);
    await cycle.connect(investor).invest(capital);

    for (const milestoneId of [0, 1, 2, 3]) {
      await cycle.connect(operator).submitMilestoneEvidence(milestoneId, `ipfs://milestone-${milestoneId}`);
      await verifierRegistry.connect(verifierA).approveMilestone(await cycle.getAddress(), milestoneId);
      await cycle.connect(operator).releaseMilestone(milestoneId);
    }

    await cycle.connect(operator).submitHarvestEvidence("ipfs://harvest-proof");
    await verifierRegistry.connect(verifierA).approveMilestone(await cycle.getAddress(), 99);
    await cycle.connect(operator).submitHarvest();

    await usdc.connect(operator).approve(await cycle.getAddress(), repayAmount);
    await cycle.connect(operator).repayAndDistribute(repayAmount);

    const verifierAInfo = await verifierRegistry.verifiers(verifierA.address);
    const verifierBInfo = await verifierRegistry.verifiers(verifierB.address);

    expect(verifierAInfo.pendingReward).to.equal(ethers.parseEther("1"));
    expect(verifierBInfo.pendingReward).to.equal(0);
  });
});
