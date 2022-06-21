// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IAxelarExecutable } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarExecutable.sol';
import './Upgradable.sol';

contract XC20Wrapper is IAxelarExecutable, Upgradable {
    error TransferFailed();

    mapping(address => address) wrapped;
    mapping(address => address) unwrapped;

    constructor() IAxelarExecutable(address(0)) {
    }

    function contractId() public pure returns (bytes32) {
        return keccak256('xc20-wrapper');
    }

    function addWrapping(string calldata symbol, address XC20Token) external {
        address axelarToken = gateway.tokenAddresses(symbol);
        wrapped[axelarToken] = XC20Token;
        wrapped[XC20Token] = axelarToken;
    }

    function wrap(address axelarToken, uint256 amount) external {
        _safeTransferFrom(axelarToken, msg.sender, amount);
        
    }

      function _safeTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount
    ) internal {
        (bool success, bytes memory returnData) = tokenAddress.call(abi.encodeWithSelector(IERC20.transfer.selector, receiver, amount));
        bool transferred = success && (returnData.length == uint256(0) || abi.decode(returnData, (bool)));

        if (!transferred || tokenAddress.code.length == 0) revert TransferFailed();
    }

    function _safeTransferFrom(
        address tokenAddress,
        address from,
        uint256 amount
    ) internal {
        (bool success, bytes memory returnData) = tokenAddress.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, address(this), amount)
        );
        bool transferred = success && (returnData.length == uint256(0) || abi.decode(returnData, (bool)));

        if (!transferred || tokenAddress.code.length == 0) revert TransferFailed();
    }
}