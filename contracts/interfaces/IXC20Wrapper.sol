// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

interface IXC20Wrapper {
    error TransferFailed();
    error NotAxelarToken();
    error NotXc20Token();
    error InsufficientBalance();
    error AlreadyWrappingAxelarToken();
    error AlreadyWrappingXC20Token();
    error NotOwnerOfXc20();
    error CannotSetMetadata();
    error CannotMint();
    error CannotBurn();
    error NotWrappingToken();
    error CouldNotSendGLMR();
    error ZeroAddress();

    event Wrapped(address indexed axelarToken, address indexed xc20, uint256 amount);
    event Unwrapped(address indexed xc20, address indexed axelarToken, uint256 amount);
    event AddedMapping(string symbol, address indexed xc20, string xc20Name, string xc20Symbol);
    event RemovedMapping(string symbol, address indexed xc20);
}
