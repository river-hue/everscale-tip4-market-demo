const ora = require('ora')
const prompts = require('prompts')

const { deployMarket, deployAccount, deployTokenRoot, getAccount, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();

  const response = await prompts([
    {
      type: 'text',
      name: 'account',
      message: 'Get Market Owner Address',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
  },
  {
      type: 'text',
      name: 'public',
      message: 'Get Market Owner Pubkey',
  },
  {
      type: 'text',
      name: 'secret',
      message: 'Get Market Owner PrivateKey',
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

  const marketOwner = await getAccount(response, response.account)

  const spinner = ora('Deploying Market').start();
  let market = await deployMarket(marketOwner, tokenRoot, { minNftTokenPrice: config.nftPrice, remainOnNft: 0 })
  spinner.stop()
  
  await logContract(market)

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
