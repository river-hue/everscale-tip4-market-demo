import { Account, Contract, locklift, getRandomNonce, TIP4 } from "./locklift";

export async function deployCollectionTradeable(account: Account, defaultTokenRoot: Contract, config = { defaultRoyaltyFee: 0, remainOnNft: 0 }): Promise<Contract> {
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

export async function mintNft(account: Account, collection: Contract, jsons: TIP4.NftMetadata[]) {
    throw 'unimplemented'
}

export async function getNftById(collection: Contract, id: number): Promise<Contract> {
    throw 'unimplemented'
}