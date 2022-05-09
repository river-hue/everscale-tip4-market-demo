import BigNumber from "bignumber.js";
import { Account, Address, Contract, locklift } from "./locklift";

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

export function transfer(account: Account, wallet: Contract, amount: number, recipient: Address): Promise<Tx> {
  return account.runTarget({
    contract: wallet,
    method: 'transfer',
    params: {
      amount,
      recipient,
      remainingGasTo: account.address,
      notify: true,
      deployWalletValue: 0,
      payload: {}
    },
    keyPair: account.keyPair,
    value: locklift.utils.convertCrystal(2, 'nano')
  })
}

export function getBalance(wallet: Contract): Promise<BigNumber> {
  return wallet.call({
    method: 'balance',
    params: { answerId: 0 }
  })
}
