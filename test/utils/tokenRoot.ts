import BigNumber from "bignumber.js";
import { Account, Contract, locklift, getRandomNonce } from "./locklift";

export async function deploy(account: Account, config: { name: string; symbol: string; decimals: string; initialSupply?: string; deployWalletValue?: string; }): Promise<Contract> {
  let { name, symbol, decimals, initialSupply, deployWalletValue } = config;
  decimals = decimals || '4';
  initialSupply = initialSupply || new BigNumber(10000000).shiftedBy(2).toFixed();
  // deployWalletValue = deployWalletValue || locklift.utils.convertCrystal('1', 'nano')
  deployWalletValue = locklift.utils.convertCrystal('0.1', 'nano');

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
      walletCode_: TokenWallet.code
    },
    keyPair: account.keyPair
  }, locklift.utils.convertCrystal('3', 'nano'));

}
