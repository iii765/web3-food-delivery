const { expect } = require("chai");

describe("OrderContract - Web3外卖平台", function () {
  let contract;
  let owner, customer, merchant, rider, stranger;
  const FOOD_AMOUNT = ethers.parseEther("0.09");
  const DELIVERY_FEE = ethers.parseEther("0.01");
  const ORDER_AMOUNT = FOOD_AMOUNT + DELIVERY_FEE;
  const MERCHANT_AMOUNT = (FOOD_AMOUNT * 90n) / 100n;
  const RIDER_AMOUNT = (DELIVERY_FEE * 90n) / 100n;
  const PROTOCOL_AMOUNT = ORDER_AMOUNT - MERCHANT_AMOUNT - RIDER_AMOUNT;

  async function createOrder() {
    return contract.connect(customer).createOrder(
      merchant.address,
      FOOD_AMOUNT,
      DELIVERY_FEE,
      '{"items":"黄焖鸡米饭"}',
      { value: ORDER_AMOUNT }
    );
  }

  before(async () => {
    [owner, customer, merchant, rider, stranger] = await ethers.getSigners();
  });

  beforeEach(async () => {
    const OrderContract = await ethers.getContractFactory("OrderContract");
    contract = await OrderContract.deploy();
  });

  describe("部署", () => {
    it("餐费和配送费的分账比例应该都是90/10", async () => {
      expect(await contract.MERCHANT_SHARE()).to.equal(90);
      expect(await contract.RIDER_SHARE()).to.equal(90);
      expect(await contract.getFoodProtocolFee()).to.equal(10);
      expect(await contract.getDeliveryProtocolFee()).to.equal(10);
    });

    it("owner应该是部署者", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("下单", () => {
    it("用户下单成功，餐费、配送费和总额均正确托管", async () => {
      await expect(createOrder())
        .to.emit(contract, "OrderCreated")
        .withArgs(1, customer.address, FOOD_AMOUNT, DELIVERY_FEE);

      const order = await contract.getOrder(1);
      expect(order.customer).to.equal(customer.address);
      expect(order.merchant).to.equal(merchant.address);
      expect(order.foodAmount).to.equal(FOOD_AMOUNT);
      expect(order.deliveryFee).to.equal(DELIVERY_FEE);
      expect(order.amount).to.equal(ORDER_AMOUNT);
    });

    it("餐费为0时应该失败", async () => {
      await expect(
        contract.connect(customer).createOrder(merchant.address, 0, DELIVERY_FEE, "{}", { value: DELIVERY_FEE })
      ).to.be.revertedWith("Food amount must be > 0");
    });

    it("支付金额必须等于餐费加配送费", async () => {
      await expect(
        contract.connect(customer).createOrder(merchant.address, FOOD_AMOUNT, DELIVERY_FEE, "{}", { value: FOOD_AMOUNT })
      ).to.be.revertedWith("Incorrect payment");
    });

    it("不能自己给自己下单", async () => {
      await expect(
        contract.connect(customer).createOrder(customer.address, FOOD_AMOUNT, DELIVERY_FEE, "{}", { value: ORDER_AMOUNT })
      ).to.be.revertedWith("Cannot order from yourself");
    });
  });

  describe("完整流程: 下单→接单→配送→确认→分账", () => {
    const orderId = 1;

    beforeEach(async () => {
      await createOrder();
    });

    it("商家接单", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      expect((await contract.getOrder(orderId)).status).to.equal(1);
    });

    it("非商家不能接单", async () => {
      await expect(contract.connect(stranger).acceptOrder(orderId)).to.be.revertedWith("Only merchant");
    });

    it("骑手抢单", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(rider).claimOrder(orderId);
      const order = await contract.getOrder(orderId);
      expect(order.rider).to.equal(rider.address);
      expect(order.status).to.equal(2);
    });

    it("骑手确认送达", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(rider).claimOrder(orderId);
      await contract.connect(rider).confirmDelivery(orderId);
      expect((await contract.getOrder(orderId)).status).to.equal(3);
    });

    it("用户确认收货：餐费商家90%，配送费骑手90%，协议获得两项各10%", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(rider).claimOrder(orderId);
      await contract.connect(rider).confirmDelivery(orderId);

      await expect(contract.connect(customer).confirmReceipt(orderId))
        .to.emit(contract, "OrderCompleted")
        .withArgs(orderId, MERCHANT_AMOUNT, RIDER_AMOUNT, PROTOCOL_AMOUNT);

      expect((await contract.getOrder(orderId)).status).to.equal(4);
      expect(await contract.protocolFees()).to.equal(PROTOCOL_AMOUNT);
      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(PROTOCOL_AMOUNT);
    });

    it("无骑手的裁决结算：商家取得餐费90%，配送费退还顾客，协议只收餐费10%", async () => {
      await contract.connect(merchant).acceptOrder(orderId);
      await contract.connect(customer).disputeOrder(orderId, "商家自配送，用户已收货");

      const foodProtocolFee = FOOD_AMOUNT - MERCHANT_AMOUNT;
      await expect(contract.connect(owner).resolveDispute(orderId, false))
        .to.emit(contract, "OrderCompleted")
        .withArgs(orderId, MERCHANT_AMOUNT, 0, foodProtocolFee);

      expect(await ethers.provider.getBalance(await contract.getAddress())).to.equal(foodProtocolFee);
      expect(await contract.protocolFees()).to.equal(foodProtocolFee);
    });
  });

  describe("取消订单", () => {
    it("Pending状态下可以取消", async () => {
      await createOrder();
      await expect(contract.connect(customer).cancelOrder(1)).to.emit(contract, "OrderCancelled");
      expect((await contract.getOrder(1)).status).to.equal(5);
    });

    it("非Pending状态不能取消", async () => {
      await createOrder();
      await contract.connect(merchant).acceptOrder(1);
      await expect(contract.connect(customer).cancelOrder(1)).to.be.revertedWith("Invalid order status");
    });
  });

  describe("争议系统", () => {
    it("订单参与者可以发起争议", async () => {
      await createOrder();
      await contract.connect(merchant).acceptOrder(1);
      await expect(contract.connect(customer).disputeOrder(1, "商家超时未配送")).to.emit(contract, "OrderDisputed");
      expect((await contract.getOrder(1)).status).to.equal(6);
    });

    it("owner可以裁决争议并退款", async () => {
      await createOrder();
      await contract.connect(merchant).acceptOrder(1);
      await contract.connect(customer).disputeOrder(1, "理由");
      await contract.connect(owner).resolveDispute(1, true);
      expect((await contract.getOrder(1)).status).to.equal(5);
    });
  });

  describe("管理功能", () => {
    it("仅owner可以提取累积协议费", async () => {
      await createOrder();
      await contract.connect(merchant).acceptOrder(1);
      await contract.connect(rider).claimOrder(1);
      await contract.connect(rider).confirmDelivery(1);
      await contract.connect(customer).confirmReceipt(1);

      await expect(contract.connect(stranger).withdrawFees(stranger.address)).to.be.revertedWith("Only owner");
      await contract.connect(owner).withdrawFees(owner.address);
      expect(await contract.protocolFees()).to.equal(0);
    });
  });
});
