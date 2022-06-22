// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { IERC20 } from './interfaces/IERC20.sol';
import { IAxelarExecutable } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGateway.sol';
import './Upgradable.sol';
import {LocalAsset} from './interfaces/LocalAsset.sol';

contract XC20Wrapper is IAxelarExecutable, Upgradable {
    error TransferFailed();
    error NotAxelarToken();
    error NotXc20Token();
    error InsufficientBalance();
    error AlreadyWrappingAxelarToken();
    error AlreadyWrappingXC20Token();
    error NotOwnerOfXc20();

    mapping(address => address) public wrapped;
    mapping(address => address) public unwrapped;

    bytes32 public xc20Codehash;

    constructor() IAxelarExecutable(address(0)) {
    }
    
    function _setup(bytes calldata data) internal override {
        (address gateway_, address owner_, bytes32 codehash_) = abi.decode(data, (address, address, bytes32));
        _transferOwnership(owner_);
        xc20Codehash = codehash_;
        gateway = IAxelarGateway(gateway_);
    }

    function contractId() public pure returns (bytes32) {
        return keccak256('xc20-wrapper');
    }

    function setXc20Codehash(bytes32 newCodehash) external onlyOwner() {
        xc20Codehash = newCodehash;
    }

    function addWrapping(
        string calldata symbol, 
        address xc20Token, 
        string memory newName, 
        string memory newSymbol
    ) external onlyOwner() {
        address axelarToken = gateway.tokenAddresses(symbol);
        if(axelarToken == address(0)) revert("NotAxelarToken()");
        if(xc20Token.codehash != xc20Codehash) revert("NotXc20Token()");
        if(wrapped[axelarToken] != address(0)) revert("AlreadyWrappingAxelarToken()");
        if(unwrapped[xc20Token] != address(0)) revert("AlreadyWrappingXC20Token()");
        wrapped[axelarToken] = xc20Token;
        unwrapped[xc20Token] = axelarToken;
        if(!LocalAsset(xc20Token).transfer_ownership(address(this))) revert("NotOwnerOfXc20()");
        LocalAsset(xc20Token).set_team(address(this), address(this), address(this));
        LocalAsset(xc20Token).set_metadata(newName, newSymbol, IERC20(axelarToken).decimals());
    }

    function removeWrapping(
        string calldata symbol
    ) external onlyOwner() {
        address axelarToken = gateway.tokenAddresses(symbol);
        if(axelarToken == address(0)) revert("NotAxelarToken()");
        address xc20Token = wrapped[axelarToken];
        if(xc20Token == address(0)) revert("NotWrappingToken()");
        wrapped[axelarToken] = address(0);
        unwrapped[xc20Token] = address(0);
    }

    function wrap(address axelarToken, uint256 amount) external {
        _safeTransferFrom(axelarToken, msg.sender, amount);
        address wrappedToken = wrapped[axelarToken];
        if(wrappedToken == address(0)) revert("NotAxelarToken()");
        LocalAsset(wrappedToken).mint(msg.sender, amount);
    }
    function unwrap(address wrappedToken, uint256 amount) external {
        address axelarToken = unwrapped[wrappedToken];
        if(axelarToken == address(0)) revert("NotXc20Token()");
        if(IERC20(wrappedToken).balanceOf(msg.sender) < amount) revert("InsufficientBalance()");
        LocalAsset(wrappedToken).burn(msg.sender, amount);
        _safeTransfer(axelarToken, msg.sender, amount);
    }

      function _safeTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount
    ) internal {
        (bool success, bytes memory returnData) = tokenAddress.call(abi.encodeWithSelector(IERC20.transfer.selector, receiver, amount));
        bool transferred = success && (returnData.length == uint256(0) || abi.decode(returnData, (bool)));

        if (!transferred || tokenAddress.code.length == 0) revert("TransferFailed()");
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

        if (!transferred || tokenAddress.code.length == 0) revert("TransferFailed()");
    }

        function _executeWithToken(
        string memory,
        string memory,
        bytes calldata payload,
        string memory tokenSymbol,
        uint256 amount
    ) internal override {
        address receiver = abi.decode(payload, (address));
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);
        address xc20 = wrapped[tokenAddress];
        if(xc20 == address(0)) {
            _safeTransfer(tokenAddress, receiver, amount);
        } else {
            LocalAsset(xc20).mint(receiver, amount);
        }
    }
}