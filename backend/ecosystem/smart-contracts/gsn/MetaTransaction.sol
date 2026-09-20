// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/Counters.sol';

contract MetaTransaction is EIP712 {
  using Counters for Counters.Counter;

  mapping(address => Counters.Counter) private _nonces;

  bytes32 private constant _PERMIT_TYPEHASH =
    keccak256(
      'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'
    );

  constructor(string memory name) EIP712(name, '1') {}

  function executeMetaTransaction(
    address tokenAddress,
    address owner,
    address to,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public {
    require(block.timestamp <= deadline, 'MetaTransaction: expired deadline');

    bytes32 structHash = keccak256(
      abi.encode(
        _PERMIT_TYPEHASH,
        owner,
        address(this),
        value,
        _useNonce(owner),
        deadline
      )
    );

    bytes32 hash = _hashTypedDataV4(structHash);

    address signer = ECDSA.recover(hash, v, r, s);
    require(signer == owner, 'MetaTransaction: invalid signature');

    IERC20 token = IERC20(tokenAddress);

    // Step 1: Set the allowance for this contract
    require(
      token.approve(address(this), value),
      'MetaTransaction: Approval failed'
    );

    // Step 2: Now that the smart contract has an allowance, execute the transfer
    require(
      token.transferFrom(owner, to, value),
      'MetaTransaction: Transfer failed'
    );
  }

  function nonces(address owner) public view returns (uint256) {
    return _nonces[owner].current();
  }

  function DOMAIN_SEPARATOR() external view returns (bytes32) {
    return _domainSeparatorV4();
  }

  function _useNonce(address owner) internal virtual returns (uint256 current) {
    Counters.Counter storage nonce = _nonces[owner];
    current = nonce.current();
    nonce.increment();
  }
}
