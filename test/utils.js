const BigNumber = require("bignumber.js");

function getRandomNonce() {
  return Math.random() * 64000 | 0;
}
exports.getRandomNonce = getRandomNonce;

async function deployAccount(keyPair, balance) {
  const account = await locklift.factory.getAccount("Wallet");

  await locklift.giver.deployContract({
    contract: account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 6400 | 0,
    },
    keyPair,
  }, locklift.utils.convertCrystal(balance, 'nano'));

  account.setKeyPair(keyPair);

  return account;
}
exports.deployAccount = deployAccount;

async function deployTokenRoot(account, name = 'Test', symbol = 'TST', decimals = '4') {

  const TokenRoot = await locklift.factory.getContract("TokenRoot");
  const TokenWallet = await locklift.factory.getContract("TokenWallet");

  return await locklift.giver.deployContract({
    contract: TokenRoot,
    constructorParams: {
      initialSupplyTo: account.address,
      initialSupply: new BigNumber(10000000).shiftedBy(2).toFixed(),
      deployWalletValue: locklift.utils.convertCrystal('1', 'nano'),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: locklift.utils.zeroAddress
    },
    initParams: {
      deployer_: locklift.utils.zeroAddress,
      randomNonce_: getRandomNonce(),
      rootOwner_: account.address,
      name_: name,
      symbol_: symbol,
      decimals_: decimals,
      walletCode_: TokenWallet.code,
    },
    keyPair: account.keyPair,
  }, locklift.utils.convertCrystal('3', 'nano'));

}
exports.deployTokenRoot = deployTokenRoot;


async function deployMarket(account, tokenRoot) {
  const Market = await locklift.factory.getContract("Market");
  const Nft = await locklift.factory.getContract("Nft");
  const Index = await locklift.factory.getContract("Index");
  const IndexBasis = await locklift.factory.getContract("IndexBasis");

  return await locklift.giver.deployContract({
    contract: Market,
    constructorParams: {
      tokenRoot: tokenRoot.address,
      minNftTokenPrice: 10,
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      ownerPubkey: account.address,
    },
    initParams: {
      _remainOnNft: 0
    },
    keyPair: account.keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'));
}
exports.deployMarket = deployMarket;

async function deployTokenWallet(account, tokenRoot) {

  let walletAddr = await tokenRoot.call({
    method: 'walletOf',
    params: {
      walletOwner: account.address,
      answerId: 0
    }
  });

  await account.runTarget({
    contract: tokenRoot,
    method: 'deployWallet',
    params: {
      walletOwner: account.address,
      deployWalletValue: locklift.utils.convertCrystal(0.1, 'nano'),
      answerId: 0
    },
    keyPair: account.keyPair,
    value: locklift.utils.convertCrystal(0.5, 'nano'),
  });

  const TokenWallet = await locklift.factory.getContract("TokenWallet");
  TokenWallet.setAddress(walletAddr);

  return TokenWallet;
}
exports.deployTokenWallet = deployTokenWallet;

function getTotalSupply(market) {
  return market.call({
    method: 'totalSupply',
    params: {
      answerId: 0
    }
  });
}
exports.getTotalSupply = getTotalSupply;

function getPurchaseCount(market) {
  return market.call({
    method: 'purchaseCount',
    params: {
      answerId: 0
    }
  });
}
exports.getPurchaseCount = getPurchaseCount;

function getTokenWallet(market) {
  return market.call({
    method: 'tokenWallet',
    params: {
      answerId: 0
    }
  });
}
exports.getTokenWallet = getTokenWallet;

async function getNftById(market, id) {
  let nft = await locklift.factory.getContract("Nft");
  let nftAddr = await market.call({
    method: 'nftAddress',
    params: { id, answerId: 0 }
  });

  nft.setAddress(nftAddr);

  return nft;
}
exports.getNftById = getNftById;

