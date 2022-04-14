import ora from 'ora'
import prompts from 'prompts';

import { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } from '../test/utils';
declare var locklift: LockLift;

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial Market owner',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'text',
      name: 'tokenRoot',
      message: 'TokenRoot Address',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'number',
      name: 'nftPrice',
      message: 'Price of Nft in Tokens',
      initial: 10
    },
    {
      type: 'number',
      name: 'remainOnNft',
      message: 'Duration (in seconds) how long proposal is open for voting',
      initial: 0
    },
  ])

  let config = {
    owner: response.owner,
    tokenRoot: response.tokenRoot,
    nftPrice: response.nftPrice,
    remainOnNft: response.remainOnNft
  }

  let tokenRoot = await locklift.factory.getContract("TokenRoot")
  tokenRoot.setAddress(config.tokenRoot)

  const spinner = ora('Deploying Market').start();
  let tempAdmin = await deployAccount(keyPair, 100)
  let market = await deployMarket(tempAdmin, tokenRoot, { minNftTokenPrice: config.nftPrice, remainOnNft: config.remainOnNft })

  spinner.text = 'Transfer Admin';
  /// Set Owner
  await tempAdmin.runTarget({
    contract: market,
    method: 'changeOwner',
    params: {
      owner: config.owner.address
    },
    keyPair: tempAdmin.keyPair,
    value: locklift.utils.convertCrystal(1, 'nano')
  })
  spinner.stop()

  await logContract(market)

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
