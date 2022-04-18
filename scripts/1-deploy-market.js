const ora = require('ora')
const prompts = require('prompts')

const { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

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
    }
  ])

  let config = {
    owner: response.owner,
    tokenRoot: response.tokenRoot,
    nftPrice: response.nftPrice,
  }

  let tokenRoot = await locklift.factory.getContract("TokenRoot")
  tokenRoot.setAddress(config.tokenRoot)

  const spinner = ora('Deploying Market').start();
  let tempAdmin = await deployAccount(keyPair, 100)
  let market = await deployMarket(tempAdmin, tokenRoot, { minNftTokenPrice: config.nftPrice, remainOnNft: 0 })

  spinner.text = 'Transfer Admin';
  /// Set Owner
  await tempAdmin.runTarget({
    contract: market,
    method: 'transferOwnership',
    params: {
      newOwner: config.owner
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
