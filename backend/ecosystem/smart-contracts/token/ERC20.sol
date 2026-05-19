// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import '../../../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '../../../node_modules/@openzeppelin/contracts/access/Ownable.sol';
import '../../../node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '../../../node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import '../../../node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol';

contract MashToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Capped, Ownable {
  uint8 private _decimals;

  constructor(
    string memory _name,
    string memory _symbol,
    address receiver,
    uint8 __decimals,
    uint256 _cap,
    uint256 initialBalance
  ) ERC20(_name, _symbol) ERC20Capped(_cap) ERC20Permit(_name) {
    _decimals = __decimals;
    if (initialBalance > 0) {
      _mint(receiver, initialBalance);
    }
  }

  function mint(address to, uint256 value) public onlyOwner {
    _mint(to, value);
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }

  function _mint(
    address account,
    uint256 amount
  ) internal virtual override(ERC20Capped, ERC20) {
    ERC20Capped._mint(account, amount);
  }
}
