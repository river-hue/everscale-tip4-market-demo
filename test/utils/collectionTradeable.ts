import BigNumber from "bignumber.js";
import { Account, Tx, Contract, locklift, getRandomNonce, TIP4, Address } from "./locklift";

export async function deploy(account: Account, defaultTokenRoot: Contract, config = { defaultRoyaltyFee: 0, remainOnNft: 0 }): Promise<Contract> {
    const CollectionTradeable = await locklift.factory.getContract("CollectionTradeable");
    const NftTradeable = await locklift.factory.getContract("NftTradeable");
    const Index = await locklift.factory.getContract("Index", 'contracts/modules/TIP4_3/compiled');
    const IndexBasis = await locklift.factory.getContract("IndexBasis", 'contracts/modules/TIP4_3/compiled');

    let { defaultRoyaltyFee, remainOnNft } = config;
    remainOnNft = remainOnNft || 0;
    defaultRoyaltyFee = defaultRoyaltyFee || 0;

    return await locklift.giver.deployContract({
        contract: CollectionTradeable,
        constructorParams: {
            codeNft: NftTradeable.code,
            codeIndex: Index.code,
            codeIndexBasis: IndexBasis.code,
            owner: account.address,
            remainOnNft: locklift.utils.convertCrystal(remainOnNft, 'nano'),
            defaultRoyaltyFee,
            defaultTokenRoot: defaultTokenRoot.address
        },
        initParams: {
            _randomNonce: getRandomNonce()
        },
        keyPair: account.keyPair
    }, locklift.utils.convertCrystal(4, 'nano'));
}

export async function openSale(account: Account, collection: Contract, config = { salePrice: 0 }): Promise<Tx> {
    let totalSupply = await getTotalSupply(collection)
    return await account.runTarget({
        contract: collection,
        method: 'openSale',
        params: {
            salePrice: config.salePrice
        },
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(totalSupply.toNumber() * 0.3, 'nano')
    })
}

export async function mintNft(account: Account, collection: Contract, nfts: TIP4.NftMetadata[], feePerNft = 3.3): Promise<Tx> {
    let jsons = nfts.map(m => JSON.stringify(m));
    let tx = await account.runTarget({
        contract: collection,
        method: 'mintNft',
        params: { owner: collection.address, jsons: jsons },
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(jsons.length * feePerNft, 'nano')
    });

    return tx;
}

export function getTotalSupply(collection: Contract): Promise<BigNumber> {
    return collection.call({
      method: 'totalSupply',
      params: {
        answerId: 0
      }
    });
  }

  export async function getNftById(collection: Contract, id: number): Promise<Contract> {
    let nft = await locklift.factory.getContract("NftTradeable");
    let nftAddr = await collection.call({
      method: 'nftAddress',
      params: { id, answerId: 0 }
    });
  
    nft.setAddress(nftAddr);
  
    return nft;
  }