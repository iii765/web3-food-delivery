// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HelloWeb3 - 你的第一个智能合约
 * @notice 简单的消息存储 + 计数器演示
 */
contract HelloWeb3 is Ownable {
    string private message;
    uint256 private counter;

    event MessageUpdated(string oldMessage, string newMessage);
    event CounterIncremented(uint256 newValue);

    constructor(string memory _initialMessage) Ownable(msg.sender) {
        message = _initialMessage;
        counter = 0;
    }

    /// 读取消息
    function getMessage() public view returns (string memory) {
        return message;
    }

    /// 更新消息
    function setMessage(string memory _newMessage) public onlyOwner {
        string memory old = message;
        message = _newMessage;
        emit MessageUpdated(old, _newMessage);
    }

    /// 计数器 +1
    function increment() public {
        counter += 1;
        emit CounterIncremented(counter);
    }

    /// 读取计数器
    function getCounter() public view returns (uint256) {
        return counter;
    }
}
