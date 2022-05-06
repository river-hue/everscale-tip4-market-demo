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

export async function getInfo(nft: Contract): Promise<{owner: Address}> {
    return await nft.call({
        method: 'getInfo',
        params: { answerId: 0 }
    })
}


type PUB_PARAMS = {
    '_tokenRoot': Address,
    '_tokenWallet': Address,
	'_salePrice': number
    '_isOpen': boolean
}

export async function getIsOpen(nft: Contract): Promise<boolean> {
    return await nft.call({
        method: '_isOpen',
        params: { answerId: 0}
    })
}