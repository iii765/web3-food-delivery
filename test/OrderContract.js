const { expect } = require("chai");

describe("OrderContract - Web3外卖平台", function () {
  let contract;
  let owner, customer, merchant, rider, stranger;
  const ORDER_AMOUNT = ethers.parseEther("0.1"); // 0.1 ETH

  before(async () => {
    [owner, customer, merchant, rider, stranger] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const OrderContract = await ethers.getContractFactory("OrderContract");
    contract = await OrderContract.deploy();
  });

  // ============ 部署 ============
  describe("部署", () => {
    it("分账比例应该是85/12/3", async () => {
      expect(await contract.merchantShare()).to.equal(85);
      expect(await contract.riderShare()).to.equal(12);
      expect(await contract.getProtocolFee()).to.equal(3);
    });

    it("owner应该是部署者", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  // ============ 下单 ============
  describe("下单", () => {
    it("用户下单成功，资金托管到合约", async () => {
      const tx = await contract.connect(customer).createOrder(
        merchant.address,
        '{"items":"黄焖鸡米饭","price":"0.1 ETH"}',
        { value: ORDER_AMOUNT }
      );

      await expect(tx).to.emit(contract, "OrderCreated");

      const order = await contract.getOrder(1);
      expect(order.customer).to.equal(customer.address);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.amount).to.equal(ORDER_AMOUNT);
    });

    it("金额为0时应该失败", async () => {
      await expect(
        contract.connect(customer).createOrder(merchant.address, "{}", { value: 0 })
      ).to.be.revertedWith("Amount must be > 0");
    });

    it("不能自己给自己下单", async () => {
      await expect(
        contract.connect(customer).createOrder(customer.address, "{}", { value: ORDER_AMOUNT })
      ).to.be.revertedWith("Cannot order from yourself");
    });
  });

  // ============ 完整订单流程 ============
  describe("完整流程: 下单→接单→配送→确认→分账", () => {
    let orderId = 1;

    beforeEach(async () => {
      await contract.connect(customer).createOrder(
        merchant.address,
        '{"items":"黄焖鸡米饭"}',
        { value: ORDER_AMOUNT }
      );
    });

    it("商家接单", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      const order = await contract.getOrder(orderId);
      expect(order.status).to.equal(1); // Accepted
    });

    it("非商家不能接单", async () => {
      await expect(
        contract.connect(stranger).acceptOrder(orderId)
      ).to.be.revertedWith("Only merchant");
    });

    it("分配骑手", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(merchant).assignRider(orderId, rider.address);

      const order = await contract.getOrder(orderId);
      expect(order.rider).to.equal(rider.address);
      expect(order.status).to.equal(2); // Delivering
    });

    it("骑手确认送达", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(merchant).assignRider(orderId, rider.address);
      await contract.connect(rider).confirmDelivery(orderId);

      const order = await contract.getOrder(orderId);
      expect(order.status).to.equal(3); // Delivered
    });

    it("用户确认收货→自动分账（核心测试）", async () => {
      // 走完流程
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(merchant).assignRider(orderId, rider.address);
      await contract.connect(rider).confirmDelivery(orderId);

      await expect(
        contract.connect(customer).confirmReceipt(orderId)
      )
        .to.emit(contract, "OrderCompleted")
        .withArgs(
          orderId,
          (ORDER_AMOUNT * 85n) / 100n,   // 商家85%
          (ORDER_AMOUNT * 12n) / 100n,   // 骑手12%
          (ORDER_AMOUNT * 3n) / 100n     // 协议3%
        );

      // 验证状态
      const order = await contract.getOrder(orderId);
      expect(order.status).to.equal(4); // Completed

      // 协议费累积
      const fees = await contract.protocolFees();
      expect(fees).to.equal((ORDER_AMOUNT * 3n) / 100n);
    });
  });

  // ============ 取消订单 ============
  describe("取消订单", () => {
    it("Pending状态下可以取消", async () => {
      await contract.connect(customer).createOrder(
        merchant.address, "{}", { value: ORDER_AMOUNT }
      );

      await expect(
        contract.connect(customer).cancelOrder(1)
      ).to.emit(contract, "OrderCancelled");

      const order = await contract.getOrder(1);
      expect(order.status).to.equal(5); // Cancelled
    });

    it("非Pending状态不能取消", async () => {
      await contract.connect(customer).createOrder(
        merchant.address, "{}", { value: ORDER_AMOUNT }
      );
      await contract.connect(merchant).acceptOrder(1);

      await expect(
        contract.connect(customer).cancelOrder(1)
      ).to.be.revertedWith("Invalid order status");
    });
  });

  // ============ 争议 ============
  describe("争议系统", () => {
    it("订单参与者可以发起争议", async () => {
      await contract.connect(customer).createOrder(
        merchant.address, "{}", { value: ORDER_AMOUNT }
      );
      await contract.connect(merchant).acceptOrder(1);

      await expect(
        contract.connect(customer).disputeOrder(1, "商家超时未配送")
      ).to.emit(contract, "OrderDisputed");

      const order = await contract.getOrder(1);
      expect(order.status).to.equal(6); // Disputed
    });

    it("owner可以裁决争议（退款）", async () => {
      await contract.connect(customer).createOrder(
        merchant.address, "{}", { value: ORDER_AMOUNT }
      );
      await contract.connect(merchant).acceptOrder(1);
      await contract.connect(customer).disputeOrder(1, "理由");

      await contract.connect(owner).resolveDispute(1, true); // true=退款

      const order = await contract.getOrder(1);
      expect(order.status).to.equal(5); // Cancelled
    });
  });

  // ============ 管理 ============
  describe("管理功能", () => {
    it("owner可以调整分账比例", async () => {
      await contract.connect(owner).setShareRatios(80, 15);
      expect(await contract.merchantShare()).to.equal(80);
      expect(await contract.riderShare()).to.equal(15);
      expect(await contract.getProtocolFee()).to.equal(5);
    });

    it("非owner不能调整", async () => {
      await expect(
        contract.connect(stranger).setShareRatios(80, 15)
      ).to.be.revertedWith("Only owner");
    });

    it("比例不能超过100", async () => {
      await expect(
        contract.connect(owner).setShareRatios(90, 20)
      ).to.be.revertedWith("Sum must be <= 100");
    });
  });
});
