// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
  function transferFrom(
    address sender,
    address recipient,
    uint256 amount
  ) external returns (bool);

  function transfer(address recipient, uint256 amount) external returns (bool);

  function balanceOf(address account) external view returns (uint256);
}

contract ReentrancyGuard {
  uint256 private _guardCounter;

  constructor() {
    _guardCounter = 1;
  }

  modifier nonReentrant() {
    _guardCounter += 1;
    uint256 localCounter = _guardCounter;
    _;
    require(localCounter == _guardCounter, 'ReentrancyGuard: reentrant call');
  }
}

contract CustodialWalletERC20 is ReentrancyGuard {
  address public masterWallet;
  address public implementation;

  uint256 public nonce;

  event Received(address indexed sender, uint256 amount, uint256 nonce);
  event TransferredNative(
    address indexed recipient,
    uint256 amount,
    uint256 nonce
  );
  event TransferredTokens(
    address indexed token,
    address indexed recipient,
    uint256 amount,
    uint256 nonce
  );
  event MasterWalletChanged(address indexed newMasterWallet, uint256 nonce);
  event ImplementationChanged(address indexed newImplementation, uint256 nonce);

  modifier onlyMaster() {
    require(msg.sender == masterWallet, 'Only master wallet can execute');
    _;
  }

  constructor(address _masterWallet) {
    masterWallet = _masterWallet;
    implementation = address(this);
  }

  // Fallback function to receive native tokens
  receive() external payable nonReentrant {
    nonce++;
    emit Received(msg.sender, msg.value, nonce);
  }

  function getNativeBalance() external view returns (uint256) {
    return address(this).balance;
  }

  function getTokenBalance(
    address tokenAddress
  ) external view returns (uint256) {
    IERC20 token = IERC20(tokenAddress);
    return token.balanceOf(address(this));
  }

  function getAllBalances(
    address[] memory tokens
  )
    external
    view
    returns (uint256 nativeBalance, uint256[] memory tokenBalances)
  {
    nativeBalance = address(this).balance;

    tokenBalances = new uint256[](tokens.length);
    for (uint i = 0; i < tokens.length; i++) {
      IERC20 token = IERC20(tokens[i]);
      tokenBalances[i] = token.balanceOf(address(this));
    }
  }

  function updateMasterWallet(address _newMasterWallet) external onlyMaster {
    masterWallet = _newMasterWallet;
    nonce++;
    emit MasterWalletChanged(masterWallet, nonce);
  }

  function updateImplementation(
    address _newImplementation
  ) external onlyMaster {
    implementation = _newImplementation;
    nonce++;
    emit ImplementationChanged(implementation, nonce);
  }

  function transferNative(
    address recipient,
    uint256 amount
  ) external onlyMaster nonReentrant {
    nonce++;
    payable(recipient).transfer(amount);
    emit TransferredNative(recipient, amount, nonce);
  }

  function transferTokens(
    address tokenAddress,
    address recipient,
    uint256 amount
  ) external onlyMaster nonReentrant {
    nonce++;
    IERC20 token = IERC20(tokenAddress);
    require(token.transfer(recipient, amount), 'Transfer failed');
    emit TransferredTokens(tokenAddress, recipient, amount, nonce);
  }

  function batchTransferNative(
    address[] memory recipients,
    uint256[] memory amounts
  ) external onlyMaster nonReentrant {
    require(recipients.length == amounts.length, 'Array lengths must match');
    for (uint256 i = 0; i < recipients.length; i++) {
      nonce++;
      payable(recipients[i]).transfer(amounts[i]);
      emit TransferredNative(recipients[i], amounts[i], nonce);
    }
  }

  function batchTransferTokens(
    address tokenAddress,
    address[] memory recipients,
    uint256[] memory amounts
  ) external onlyMaster nonReentrant {
    require(recipients.length == amounts.length, 'Array lengths must match');
    IERC20 token = IERC20(tokenAddress);
    for (uint256 i = 0; i < recipients.length; i++) {
      nonce++;
      require(token.transfer(recipients[i], amounts[i]), 'Transfer failed');
      emit TransferredTokens(tokenAddress, recipients[i], amounts[i], nonce);
    }
  }
}
