import { Account, Contract, locklift } from "./locklift";

export async function deploy(account: Account, tokenRoot: Contract): Promise<Contract> {

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
    value: locklift.utils.convertCrystal(0.5, 'nano')
  });

  const TokenWallet = await locklift.factory.getContract("TokenWallet");
  TokenWallet.setAddress(walletAddr);

  return TokenWallet;
}
