import BigNumber from "bignumber.js";
const logger = require('mocha-logger');

declare var locklift: LockLift;

export interface LockLift {
  factory: { getContract: (contract: string) => Promise<Contract>, getAccount: (type: string) => Promise<Account> },
  keys: { getKeyPairs: () => Promise<KeyPair[]>},
  utils: { convertCrystal: (balance: number| string, type: 'nano' | string ) => string, zeroAddress: string },
  ton: { getBalance: (address: string) => string }
  giver: Account
}
export interface KeyPair { public: string, private: string }
export interface Contract { 
  name: string,
  address: string,
  keyPair: KeyPair,
  code: string,
  setAddress: (address: string) => void;
  call: (opts: {method: string, params: any}) => Promise<any>,
};
export interface Account extends Contract  { 
  setKeyPair: (keyPair: KeyPair) => void,
  deployContract: (opts: { contract: Contract, constructorParams: any, initParams: any, keyPair: KeyPair }, value?: string) => Promise<any>,
  runTarget: (opts: {contract: Contract, method: string, params: any, keyPair: KeyPair, value: string}) => Promise<any>
}

export const isValidTonAddress = (address: string) => /^(?:-1|0):[0-9a-fA-F]{64}$/.test(address);

export const getRandomNonce = () => Math.random() * 64000 | 0;

export async function logContract(contract: Contract) {
  const balance = await locklift.ton.getBalance(contract.address);
  logger.log(`${contract.name} (${contract.address}) - ${locklift.utils.convertCrystal(balance, 'ton')}`);
};

export async function deployAccount(keyPair: KeyPair, balance: number): Promise<Account> {
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

export async function deployTokenRoot(account: Account, config: { name: string, symbol: string, decimals: string, initialSupply?: string, deployWalletValue?: string }) {
  let { name, symbol, decimals, initialSupply, deployWalletValue } = config;
  decimals = decimals || '4'
  initialSupply = initialSupply || new BigNumber(10000000).shiftedBy(2).toFixed()
  deployWalletValue = deployWalletValue || locklift.utils.convertCrystal('1', 'nano')

  const TokenRoot = await locklift.factory.getContract("TokenRoot");
  const TokenWallet = await locklift.factory.getContract("TokenWallet");

  return await locklift.giver.deployContract({
    contract: TokenRoot,
    constructorParams: {
      initialSupplyTo: account.address,
      initialSupply,
      deployWalletValue,
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

export async function deployMarket(account: Account, tokenRoot: Contract, config = { minNftTokenPrice: 10, remainOnNft: 0 }): Promise<Contract> {
  const Market = await locklift.factory.getContract("Market");
  const Nft = await locklift.factory.getContract("Nft");
  const Index = await locklift.factory.getContract("Index");
  const IndexBasis = await locklift.factory.getContract("IndexBasis");

  let { minNftTokenPrice, remainOnNft } = config;
  minNftTokenPrice = minNftTokenPrice || 10;
  remainOnNft = remainOnNft || 0;

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

export async function deployTokenWallet(account: Account, tokenRoot: Contract): Promise<Contract> {

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

export function getTotalSupply(market: Contract) {
  return market.call({
    method: 'totalSupply',
    params: {
      answerId: 0
    }
  });
}

export function getPurchaseCount(market: Contract) {
  return market.call({
    method: 'purchaseCount',
    params: {
      answerId: 0
    }
  });
}

export function getTokenWallet(market: Contract) {
  return market.call({
    method: 'tokenWallet',
    params: {
      answerId: 0
    }
  });
}

export async function getNftById(market: Contract, id: number) {
  let nft = await locklift.factory.getContract("Nft");
  let nftAddr = await market.call({
    method: 'nftAddress',
    params: { id, answerId: 0 }
  });

  nft.setAddress(nftAddr);

  return nft;
}
