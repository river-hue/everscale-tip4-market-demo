import BigNumber from "bignumber.js";
import { Account, Address, Contract, locklift, TIP4, Tx } from "./locklift";

export function openSale(account: Account, nft: Contract, config = { salePrice: 0 }): Promise<Tx> {
    return account.runTarget({
        contract: nft,
        method: 'openSale',
        params: {
            salePrice: config.salePrice
        },
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(0.3, 'nano')
    })
}

export function closeSale(account: Account, nft: Contract): Promise<Tx> {
    return account.runTarget({
        contract: nft,
        method: 'closeSale',
        params: {},
        keyPair: account.keyPair,
        value: locklift.utils.convertCrystal(0.3, 'nano')
    })
}

export async function getJson(nft: Contract): Promise<TIP4.NftMetadata> {
    const res_json = await nft.call({
        method: 'getJson',
        params: { answerId: 0 }
    })
    return JSON.parse(res_json)
}

export async function getInfo(nft: Contract): Promise<{
    id: BigNumber,
    owner: Address,
    manager: Address,
    collection: Address
}> {
    return await nft.call({
        method: 'getInfo',
        params: { answerId: 0 }
    })
}

export function getTokenRoot(nft: Contract): Promise<Address> {
    return nft.call({
        method: '_tokenRoot',
        params: { answerId: 0 }
    })
}

export function getTokenWallet(nft: Contract): Promise<Address> {
    return nft.call({
        method: '_tokenWallet',
        params: { answerId: 0 }
    })
}

export async function getRoyaltyFee(nft: Contract): Promise<{ royaltyFee: BigNumber, decimals: BigNumber }> {
    let royaltyFee = await nft.call({
        method: '_royaltyFee',
        params: { answerId: 0 }
    })
    let decimals = await nft.call({
        method: 'ROYALTY_FEE_DECIMALS',
        params: { answerId: 0 }
    })

    return { royaltyFee, decimals }
}


export function getSalePrice(nft: Contract): Promise<BigNumber> {
    return nft.call({
        method: '_salePrice',
        params: { answerId: 0 }
    })
}

export function getIsOnSale(nft: Contract): Promise<boolean> {
    return nft.call({
        method: '_isOnSale',
        params: { answerId: 0 }
    })
}