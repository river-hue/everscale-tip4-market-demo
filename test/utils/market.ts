import BigNumber from "bignumber.js";
import { Account, Contract, locklift, getRandomNonce, TIP4, Tx } from "./locklift";

export async function deployMarket(account: Account, tokenRoot: Contract, config = { minNftTokenPrice: 10, remainOnNft: 0 }): Promise<Contract> {
  const Market = await locklift.factory.getContract("Market");
  const Nft = await locklift.factory.getContract("Nft");
  const Index = await locklift.factory.getContract("Index", 'contracts/modules/TIP4_3/compiled');
  const IndexBasis = await locklift.factory.getContract("IndexBasis", 'contracts/modules/TIP4_3/compiled');

  let { minNftTokenPrice, remainOnNft } = config;
  minNftTokenPrice = minNftTokenPrice || 10;
  remainOnNft = remainOnNft || 0;

  return await locklift.giver.deployContract({
    contract: Market,
    constructorParams: {
      tokenRoot: tokenRoot.address,
      minNftTokenPrice,
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      owner: account.address,
      remainOnNft: locklift.utils.convertCrystal(remainOnNft, 'nano')
    },
    initParams: {
      _randomNonce: getRandomNonce()
    },
    keyPair: account.keyPair
  }, locklift.utils.convertCrystal(4, 'nano'));
}


export function getTotalSupply(market: Contract): Promise<BigNumber> {
  return market.call({
    method: 'totalSupply',
    params: {
      answerId: 0
    }
  });
}

export function getPurchaseCount(market: Contract): Promise<BigNumber> {
  return market.call({
    method: 'purchaseCount',
    params: {
      answerId: 0
    }
  });
}

export async function getTokenWallet(market: Contract): Promise<Contract> {
  const tokenWallet = await locklift.factory.getContract("TokenWallet");
  let walletAddr = await market.call({
    method: 'tokenWallet',
    params: {
      answerId: 0
    }
  });

  tokenWallet.setAddress(walletAddr);

  return tokenWallet;
}

export async function getNftById(market: Contract, id: number): Promise<Contract> {
  let nft = await locklift.factory.getContract("Nft");
  let nftAddr = await market.call({
    method: 'nftAddress',
    params: { id, answerId: 0 }
  });

  nft.setAddress(nftAddr);

  return nft;
}

export async function batchMintNft(market: Contract, account: Account, nfts: TIP4.NftMetadata[], feePerNft = 3.3): Promise<Tx> {
  let jsons = nfts.map(m => JSON.stringify(m));
  return await account.runTarget({
    contract: market,
    method: 'batchMintNft',
    params: { owner: market.address, jsons: jsons },
    keyPair: account.keyPair,
    value: locklift.utils.convertCrystal(jsons.length * feePerNft, 'nano')
  });
}
