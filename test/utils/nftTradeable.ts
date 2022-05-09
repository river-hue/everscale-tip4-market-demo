import BigNumber from "bignumber.js";
import { Account, Address, Contract, locklift, TIP4 } from "./locklift";

export async function openSale(account: Account, nft: Contract, config = { salePrice: 0 }): Promise<void> {
    throw 'unimplemented'
}

export async function getJson(nft: Contract): Promise<any> {
    const res_json = await nft.call({
        method: 'getJson',
        params: { answerId: 0 }
    })
    return JSON.parse(res_json)
}

export async function getInfo(nft: Contract): Promise<{ owner: Address }> {
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

export async function getRoyaltyFee(nft: Contract): Promise<{royaltyFee: BigNumber, decimals: BigNumber}> {
    let royaltyFee = await nft.call({
        method: '_royaltyFee',
        params: { answerId: 0 }
    })
    let decimals = await nft.call({
        method: 'ROYALTY_FEE_DECIMALS',
        params: {answerId: 0}
    })
    
    return { royaltyFee, decimals }
}


export function getSalePrice(nft: Contract): Promise<BigNumber> {
    return nft.call({
        method: '_salePrice',
        params: { answerId: 0 }
    })
}

export function getIsOpen(nft: Contract): Promise<boolean> {
    return nft.call({
        method: '_isOpen',
        params: { answerId: 0 }
    })
}