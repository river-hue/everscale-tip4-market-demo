const ora = require('ora')
const prompts = require('prompts')

const { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();

  console.log("Creating Token")

  let tempAdmin = await deployAccount(keyPair, 100)

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Initial Token owner',
      initial: tempAdmin.address,
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
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

  const spinner = ora('Deploying TokenRoot').start();
  let tokenRoot = await deployTokenRoot(tempAdmin, {
    name: config.tokenName,
    symbol: config.tokenSymbol,
    decimals: config.tokenDecimals,
  })

  spinner.text = 'Transfer Admin';

  // Set Owner
  await tempAdmin.runTarget({
    contract: tokenRoot,
    method: 'transferOwnership',
    params: {
      newOwner: config.owner,
      remainingGasTo: config.owner,
      callbacks: {},
    },
    keyPair: tempAdmin.keyPair,
    value: locklift.utils.convertCrystal(1, 'nano')
  })
  spinner.stop()

  await logContract(tokenRoot)
  console.log(`Admin: ${config.owner}`)
  console.log(`TempAdmin keyPair:`)
  console.log(tempAdmin.keyPair)
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
