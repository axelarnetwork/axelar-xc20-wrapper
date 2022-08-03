// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { IERC20 } from './interfaces/IERC20.sol';
import { AxelarExecutable } from '@axelar-network/axelar-utils-solidity/contracts/executables/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-utils-solidity/contracts/interfaces/IAxelarGateway.sol';
import { Upgradable} from './Upgradable.sol';
import { LocalAsset } from './interfaces/LocalAsset.sol';
import { IXC20Wrapper } from './interfaces/IXC20Wrapper.sol';

contract XC20Wrapper is IXC20Wrapper, AxelarExecutable, Upgradable {

    mapping(address => address) public axelarTokenToXc20;
    mapping(address => address) public xc20ToAxelarToken;

    bytes32 public xc20Codehash;
    address public immutable gatewayAddress;

    constructor(address gatewayAddress_) {
        gatewayAddress = gatewayAddress_;
    }

    function gateway() public view override returns (IAxelarGateway) {
        return IAxelarGateway(gatewayAddress);
    }

    function _setup(bytes calldata data) internal override {
        (address owner_, bytes32 codehash_) = abi.decode(data, (address, bytes32));
        _transferOwnership(owner_);
        xc20Codehash = codehash_;
    }

    function contractId() public pure returns (bytes32) {
        return keccak256('xc20-wrapper');
    }

    function addMapping(
        string calldata symbol,
        address xc20Token,
        string memory newName,
        string memory newSymbol
    ) external payable onlyOwner {
        address axelarToken = gateway().tokenAddresses(symbol);
        if (axelarToken == address(0)) revert('NotAxelarToken()');
        if (xc20Token.codehash != xc20Codehash) revert('NotXc20Token()');
        if (axelarTokenToXc20[axelarToken] != address(0)) revert('AlreadyWrappingAxelarToken()');
        if (xc20ToAxelarToken[xc20Token] != address(0)) revert('AlreadyWrappingXC20Token()');
        axelarTokenToXc20[axelarToken] = xc20Token;
        xc20ToAxelarToken[xc20Token] = axelarToken;
        if (!LocalAsset(xc20Token).set_team(address(this), address(this), address(this))) revert('NotOwner()');
        if (!LocalAsset(xc20Token).set_metadata(newName, newSymbol, IERC20(axelarToken).decimals())) revert('CannotSetMetadata()');
        payable(msg.sender).transfer(address(this).balance);
        emit AddedMapping(symbol, xc20Token, newName, newSymbol);
    }

    function removeMapping(string calldata symbol) external onlyOwner {
        address axelarToken = gateway().tokenAddresses(symbol);
        if (axelarToken == address(0)) revert('NotAxelarToken()');
        address xc20 = axelarTokenToXc20[axelarToken];
        if (xc20 == address(0)) revert('NotWrappingToken()');
        axelarTokenToXc20[axelarToken] = address(0);
        xc20ToAxelarToken[xc20] = address(0);
        emit RemovedMapping(symbol, xc20);
    }

    function wrap(address axelarToken, uint256 amount) external {
        _safeTransferFrom(axelarToken, msg.sender, amount);
        address xc20 = axelarTokenToXc20[axelarToken];
        if (xc20 == address(0)) revert('NotAxelarToken()');
        if (!LocalAsset(xc20).mint(msg.sender, amount)) revert('CannotMint()');
    }

    function unwrap(address xc20, uint256 amount) external {
        address axelarToken = xc20ToAxelarToken[xc20];
        if (axelarToken == address(0)) revert('NotXc20Token()');
        if (IERC20(xc20).balanceOf(msg.sender) < amount) revert('InsufficientBalance()');
        if (!LocalAsset(xc20).burn(msg.sender, amount)) revert('CannotBurn()');
        _safeTransfer(axelarToken, msg.sender, amount);
    }

    function _safeTransfer(
        address tokenAddress,
        address receiver,
        uint256 amount
    ) internal {
        (bool success, bytes memory returnData) = tokenAddress.call(abi.encodeWithSelector(IERC20.transfer.selector, receiver, amount));
        bool transferred = success && (returnData.length == uint256(0) || abi.decode(returnData, (bool)));

        if (!transferred || tokenAddress.code.length == 0) revert('TransferFailed()');
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

        if (!transferred || tokenAddress.code.length == 0) revert('TransferFailed()');
    }

    function _executeWithToken(
        string calldata,
        string calldata,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        address receiver = abi.decode(payload, (address));
        address tokenAddress = gateway().tokenAddresses(tokenSymbol);
        address xc20 = axelarTokenToXc20[tokenAddress];
        if (xc20 == address(0) || !LocalAsset(xc20).mint(receiver, amount)) {
            _safeTransfer(tokenAddress, receiver, amount);
        }
    }
}
