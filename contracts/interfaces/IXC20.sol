// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { IERC20 } from './IERC20.sol';
import { LocalAsset } from './LocalAsset.sol';

interface IXC20 is IERC20, LocalAsset {}
