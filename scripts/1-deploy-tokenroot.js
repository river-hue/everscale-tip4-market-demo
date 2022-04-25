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
      name: 'account',
      message: 'Get Token Owner Address',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'text',
      name: 'public',
      message: 'Get Token Owner Pubkey',
    },
    {
      type: 'text',
      name: 'secret',
      message: 'Get Token Owner PrivateKey',
    },
    {
      type: 'text',
      name: 'tokenName',
      message: 'Token Name',
      initial: 'Test Token'
    },
    {
      type: 'text',
      name: 'tokenSymbol',
      message: 'Token Symbol',
      initial: 'TST'
    },
    {
      type: 'number',
      name: 'tokenDecimals',
      message: 'Decimals',
      initial: 2
    }
  ])

  let config = {
    owner: response.owner,
    tokenName: response.tokenName,
    tokenSymbol: response.tokenSymbol,
    tokenDecimals: response.tokenDecimals.toString()
  }

  const rootOwner = await getAccount(response, response.account)

  const spinner = ora('Deploying TokenRoot').start();
  let tokenRoot = await deployTokenRoot(rootOwner, {
    name: config.tokenName,
    symbol: config.tokenSymbol,
    decimals: config.tokenDecimals,
  })

  spinner.stop()

  await logContract(tokenRoot)
  console.log(`Admin: ${config.owner}`)
  console.log(`TempAdmin keyPair:`)
  console.log(rootOwner.keyPair)
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
