// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

contract Proxy {
  address public implementation;

  constructor(address _implementation) {
    implementation = _implementation;
  }

  function upgradeTo(address _newImplementation) external {
    require(msg.sender == tx.origin, 'Proxy: Only EOAs can upgrade');
    implementation = _newImplementation;
  }

  // Explicit receive ether function
  receive() external payable {
    // Custom logic for receiving ether can be put here.
    // If empty, it defaults to accepting ether being sent.
  }

  fallback() external payable {
    address _implementation = implementation;
    require(_implementation != address(0));

    assembly {
      let ptr := mload(0x40)
      calldatacopy(ptr, 0, calldatasize())
      let result := delegatecall(
        gas(),
        _implementation,
        ptr,
        calldatasize(),
        0,
        0
      )
      let size := returndatasize()
      returndatacopy(ptr, 0, size)

      switch result
      case 0 {
        revert(ptr, size)
      }
      default {
        return(ptr, size)
      }
    }
  }
}
