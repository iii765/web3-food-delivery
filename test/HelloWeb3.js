const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HelloWeb3", function () {
  let hello, owner, otherAccount;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();
    const HelloWeb3 = await ethers.getContractFactory("HelloWeb3");
    hello = await HelloWeb3.deploy("Hello World");
  });

  it("should return initial message", async function () {
    expect(await hello.getMessage()).to.equal("Hello World");
  });

  it("should allow owner to update message", async function () {
    await hello.setMessage("New Message");
    expect(await hello.getMessage()).to.equal("New Message");
  });

  it("should revert for non-owner", async function () {
    await expect(
      hello.connect(otherAccount).setMessage("Hack")
    ).to.be.reverted;
  });

  it("should increment counter", async function () {
    await hello.increment();
    await hello.increment();
    expect(await hello.getCounter()).to.equal(2);
  });
});
