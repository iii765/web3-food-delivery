// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OrderContract
 * @notice Web3外卖平台核心订单合约
 * @dev 资金托管 → 商家接单 → 骑手配送 → 确认收货 → 自动分账
 *
 * 分账规则：
 *   - 餐费：商家 90%，协议 10%
 *   - 配送费：骑手 90%，协议 10%
 */

contract OrderContract {
    // ============ 状态变量 ============

    address public owner;              // 协议管理员
    uint256 public orderCount;         // 总订单数
    uint256 public protocolFees;       // 累积协议费
    uint256 public constant MERCHANT_SHARE = 90; // 餐费中商家比例(%)
    uint256 public constant RIDER_SHARE = 90;    // 配送费中骑手比例(%)

    // ============ 枚举 ============

    enum OrderStatus {
        Pending,     // 0: 等待商家接单
        Accepted,    // 1: 商家已接单
        Delivering,  // 2: 骑手配送中
        Delivered,   // 3: 已送达，待确认
        Completed,   // 4: 已完成（已分账）
        Cancelled,   // 5: 已取消（退款）
        Disputed     // 6: 争议中
    }

    // ============ 结构体 ============

    struct Order {
        uint256 id;
        address customer;       // 用户
        address payable merchant; // 商家（可收款）
        address payable rider;    // 骑手（可收款）
        uint256 foodAmount;     // 餐费(wei)
        uint256 deliveryFee;    // 配送费(wei)
        uint256 amount;         // 总金额(餐费 + 配送费，wei)
        uint256 timestamp;      // 下单时间
        OrderStatus status;
        string metadata;        // 订单详情IPFS hash / JSON string
    }

    // ============ 映射 ============

    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public customerOrders;  // 用户订单列表

    // ============ 事件 ============

    event OrderCreated(uint256 indexed orderId, address indexed customer, uint256 foodAmount, uint256 deliveryFee);
    event OrderAccepted(uint256 indexed orderId, address indexed merchant);
    event RiderAssigned(uint256 indexed orderId, address indexed rider);
    event OrderDelivered(uint256 indexed orderId);
    event OrderCompleted(uint256 indexed orderId, uint256 merchantAmount, uint256 riderAmount, uint256 protocolAmount);
    event OrderCancelled(uint256 indexed orderId);
    event OrderDisputed(uint256 indexed orderId, string reason);

    // ============ 修饰器 ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyCustomer(uint256 _orderId) {
        require(msg.sender == orders[_orderId].customer, "Only customer");
        _;
    }

    modifier onlyMerchant(uint256 _orderId) {
        require(msg.sender == orders[_orderId].merchant, "Only merchant");
        _;
    }

    modifier inStatus(uint256 _orderId, OrderStatus _status) {
        require(orders[_orderId].status == _status, "Invalid order status");
        _;
    }

    // ============ 构造函数 ============

    constructor() {
        owner = msg.sender;
    }

    // ============ 核心函数 ============

    /**
     * @notice 用户下单，资金托管到合约
     * @param _merchant 商家地址
     * @param _foodAmount 餐费（wei）
     * @param _deliveryFee 配送费（wei）
     * @param _metadata 订单详情（JSON: {items, note}）
     */
    function createOrder(
        address payable _merchant,
        uint256 _foodAmount,
        uint256 _deliveryFee,
        string calldata _metadata
    ) external payable returns (uint256) {
        require(_foodAmount > 0, "Food amount must be > 0");
        require(msg.value == _foodAmount + _deliveryFee, "Incorrect payment");
        require(_merchant != address(0), "Invalid merchant");
        require(_merchant != msg.sender, "Cannot order from yourself");

        orderCount++;
        uint256 orderId = orderCount;

        orders[orderId] = Order({
            id: orderId,
            customer: msg.sender,
            merchant: _merchant,
            rider: payable(address(0)), // 待分配
            foodAmount: _foodAmount,
            deliveryFee: _deliveryFee,
            amount: msg.value,
            timestamp: block.timestamp,
            status: OrderStatus.Pending,
            metadata: _metadata
        });

        customerOrders[msg.sender].push(orderId);

        emit OrderCreated(orderId, msg.sender, _foodAmount, _deliveryFee);
        return orderId;
    }

    /**
     * @notice 商家接单
     */
    function acceptOrder(uint256 _orderId)
        external
        onlyMerchant(_orderId)
        inStatus(_orderId, OrderStatus.Pending)
    {
        orders[_orderId].status = OrderStatus.Accepted;
        emit OrderAccepted(_orderId, msg.sender);
    }

    /**
     * @notice 骑手自主抢单（任何人都可以调，先到先得）
     * @dev 商家接单后状态变为 Accepted，骑手调此函数抢单
     */
    function claimOrder(uint256 _orderId)
        external
        inStatus(_orderId, OrderStatus.Accepted)
    {
        Order storage order = orders[_orderId];
        require(msg.sender != order.customer, "Customer cannot be rider");
        require(msg.sender != order.merchant, "Merchant cannot be rider");

        order.rider = payable(msg.sender);
        order.status = OrderStatus.Delivering;
        emit RiderAssigned(_orderId, msg.sender);
    }

    /**
     * @notice 骑手确认送达
     */
    function confirmDelivery(uint256 _orderId)
        external
        inStatus(_orderId, OrderStatus.Delivering)
    {
        require(msg.sender == orders[_orderId].rider, "Only assigned rider");
        orders[_orderId].status = OrderStatus.Delivered;
        emit OrderDelivered(_orderId);
    }

    /**
     * @notice 用户确认收货 → 自动分账
     * @dev 有骑手时：商家85% + 骑手12% + 协议3%；无骑手（自配送）时：商家97% + 协议3%
     */
    function confirmReceipt(uint256 _orderId)
        external
        onlyCustomer(_orderId)
        inStatus(_orderId, OrderStatus.Delivered)
    {
        Order storage order = orders[_orderId];
        order.status = OrderStatus.Completed;
        _settleOrder(_orderId, order);
    }

    /**
     * @notice 用户取消订单（仅在Pending状态可取消）
     */
    function cancelOrder(uint256 _orderId)
        external
        onlyCustomer(_orderId)
        inStatus(_orderId, OrderStatus.Pending)
    {
        Order storage order = orders[_orderId];
        order.status = OrderStatus.Cancelled;

        // 全额退款
        (bool success, ) = order.customer.call{value: order.amount}("");
        require(success, "Refund failed");

        emit OrderCancelled(_orderId);
    }

    /**
     * @notice 发起争议
     */
    function disputeOrder(uint256 _orderId, string calldata _reason)
        external
    {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.customer ||
            msg.sender == order.merchant ||
            msg.sender == order.rider,
            "Not a participant"
        );
        require(
            order.status == OrderStatus.Accepted ||
            order.status == OrderStatus.Delivering ||
            order.status == OrderStatus.Delivered,
            "Cannot dispute at this stage"
        );

        order.status = OrderStatus.Disputed;
        emit OrderDisputed(_orderId, _reason);
    }

    // ============ 管理函数 ============

    /**
     * @notice 管理员裁决争议
     * @param _refundToCustomer true=退款给用户，false=强制完成分账
     */
    function resolveDispute(uint256 _orderId, bool _refundToCustomer)
        external
        onlyOwner
        inStatus(_orderId, OrderStatus.Disputed)
    {
        Order storage order = orders[_orderId];

        if (_refundToCustomer) {
            order.status = OrderStatus.Cancelled;
            (bool success, ) = order.customer.call{value: order.amount}("");
            require(success, "Refund failed");
            emit OrderCancelled(_orderId);
        } else {
            // 强制完成分账
            order.status = OrderStatus.Completed;
            _settleOrder(_orderId, order);
        }
    }

    /**
     * @dev 统一结算逻辑，避免正常确认和争议裁决的资金分配规则不一致。
     * 餐费：商家 90%、协议 10%；配送费：骑手 90%、协议 10%。
     * 无骑手的裁决结算中，配送费原路退款给顾客，避免商家获得未履行的配送服务费。
     */
    function _settleOrder(uint256 _orderId, Order storage order) internal {
        uint256 merchantAmount = (order.foodAmount * MERCHANT_SHARE) / 100;
        uint256 riderAmount = 0;
        uint256 customerRefund = 0;

        if (order.rider != address(0)) {
            riderAmount = (order.deliveryFee * RIDER_SHARE) / 100;
        } else {
            customerRefund = order.deliveryFee;
        }

        uint256 protocolAmount = order.amount - merchantAmount - riderAmount - customerRefund;
        protocolFees += protocolAmount;

        (bool mSuccess, ) = order.merchant.call{value: merchantAmount}("");
        require(mSuccess, "Merchant payment failed");

        if (riderAmount > 0) {
            (bool rSuccess, ) = order.rider.call{value: riderAmount}("");
            require(rSuccess, "Rider payment failed");
        }

        if (customerRefund > 0) {
            (bool cSuccess, ) = order.customer.call{value: customerRefund}("");
            require(cSuccess, "Delivery fee refund failed");
        }

        emit OrderCompleted(_orderId, merchantAmount, riderAmount, protocolAmount);
    }

    /**
     * @notice 提取协议费
     */
    function withdrawFees(address payable _to) external onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 amount = protocolFees;
        protocolFees = 0;
        (bool success, ) = _to.call{value: amount}("");
        require(success, "Withdraw failed");
    }

    // ============ 查询函数 ============

    function getOrder(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }

    function getCustomerOrders(address _customer) external view returns (uint256[] memory) {
        return customerOrders[_customer];
    }

    function getFoodProtocolFee() external pure returns (uint256) {
        return 100 - MERCHANT_SHARE;
    }

    function getDeliveryProtocolFee() external pure returns (uint256) {
        return 100 - RIDER_SHARE;
    }
}
