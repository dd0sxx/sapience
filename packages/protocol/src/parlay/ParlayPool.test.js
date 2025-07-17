const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ParlayPool", function () {
    let ParlayPool;
    let parlayPool;
    let ParlayNFT;
    let parlayNFT;
    let MockERC20;
    let stablecoin;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        const signers = await ethers.getSigners();
        owner = signers[0];
        addr1 = signers[1];
        addr2 = signers[2];

        // Deploy Mock Stablecoin
        MockERC20 = await ethers.getContractFactory("MockERC20");
        stablecoin = await MockERC20.deploy("Mock Stablecoin", "MSD", 18, ethers.parseEther("1000000"));
        await stablecoin.waitForDeployment();

        // Deploy ParlayNFT
        ParlayNFT = await ethers.getContractFactory("ParlayNFT");
        parlayNFT = await ParlayNFT.deploy();
        await parlayNFT.waitForDeployment();

        // Deploy ParlayPool
        ParlayPool = await ethers.getContractFactory("ParlayPool");
        
        const stablecoinAddress = await stablecoin.getAddress();
        const parlayNFTAddress = await parlayNFT.getAddress();
        const ownerAddress = await owner.getAddress();

        parlayPool = await ParlayPool.deploy(
            ownerAddress, // Mock Odds Oracle
            ownerAddress, // Mock Correlation Oracle
            ownerAddress, // Mock Sapience Market Registry
            stablecoinAddress,
            ownerAddress, // Mock UMA Oracle Registry
            parlayNFTAddress
        );
        await parlayPool.waitForDeployment();

        // Transfer ownership of ParlayNFT to ParlayPool
        await parlayNFT.transferOwnership(await parlayPool.getAddress());

        // Mint some stablecoins for testing
        await stablecoin.mint(addr1.address, ethers.parseEther("1000"));
        await stablecoin.mint(addr2.address, ethers.parseEther("1000"));

        // Approve ParlayPool to spend stablecoins
        await stablecoin.connect(addr1).approve(await parlayPool.getAddress(), ethers.parseEther("1000"));
        await stablecoin.connect(addr2).approve(await parlayPool.getAddress(), ethers.parseEther("1000"));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await parlayPool.owner()).to.equal(owner.address);
        });

        it("Should have correct stablecoin address", async function () {
            expect(await parlayPool.stablecoin()).to.equal(await stablecoin.getAddress());
        });

        it("Should have correct ParlayNFT address", async function () {
            expect(await parlayPool.parlayNft()).to.equal(await parlayNFT.getAddress());
        });
    });

    describe("LP Deposits", function () {
        it("Should allow LP to deposit stablecoins", async function () {
            const depositAmount = ethers.parseEther("100");
            await parlayPool.connect(addr1).depositLP(depositAmount);

            expect(await stablecoin.balanceOf(await parlayPool.getAddress())).to.equal(depositAmount);
            expect((await parlayPool.lpPositions(addr1.address)).shares).to.equal(depositAmount);
            expect(await parlayPool.totalShares()).to.equal(depositAmount);
            expect(await parlayPool.totalPrinciple()).to.equal(depositAmount);
        });

        it("Should not allow deposit below MIN_LP_DEPOSIT", async function () {
            const depositAmount = ethers.parseEther("10"); // Less than default MIN_LP_DEPOSIT (100)
            await expect(parlayPool.connect(addr1).depositLP(depositAmount)).to.be.revertedWith("Deposit amount too low");
        });

        it("Should calculate shares correctly for subsequent deposits", async function () {
            const depositAmount1 = ethers.parseEther("100");
            await parlayPool.connect(addr1).depositLP(depositAmount1);

            const depositAmount2 = ethers.parseEther("200");
            await parlayPool.connect(addr2).depositLP(depositAmount2);

            // Assuming 1:1 ratio for simplicity in initial tests, will adjust as NAV calculation is implemented
            expect((await parlayPool.lpPositions(addr1.address)).shares).to.equal(depositAmount1);
            expect((await parlayPool.lpPositions(addr2.address)).shares).to.equal(depositAmount2);
            expect(await parlayPool.totalShares()).to.equal(depositAmount1.add(depositAmount2));
        });
    });

    // TODO: Add tests for requestParlay, settleParlay, requestWithdrawal, sweepExpiredParlay, and risk management
});


