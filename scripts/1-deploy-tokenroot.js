// @ts-check
const ora = require('ora')
const prompts = require('prompts')

const { deployMarket, deployAccount, deployTokenRoot, getAccount, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')


/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();
  const giverAddress = locklift.giver.giver.address;

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Get Token Owner Address',
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

  const tempAdmin = await deployAccount(keyPair, 5);
  console.log('Deploying TempAdmin:', tempAdmin.address)
  console.log('TempAdmin PubKey:', tempAdmin.keyPair.public)
  console.log('TempAdmin Secret', tempAdmin.keyPair.secret)

  const spinner = ora('Deploying TokenRoot').start();
  let tokenRoot = await deployTokenRoot(tempAdmin, {
    name: config.tokenName,
    symbol: config.tokenSymbol,
    decimals: config.tokenDecimals,
  })
  await logContract(tokenRoot)

  spinner.text = 'Transfering Ownership to: ' + config.owner
  
  await tempAdmin.runTarget({
    contract: tokenRoot,
    method: 'transferOwnership',
    params: {
      newOwner: config.owner,
      remainingGasTo: config.owner,
      callbacks: {}
    },
    keyPair: tempAdmin.keyPair,
    value: locklift.utils.convertCrystal(1, 'nano')
  })

  console.log('Transfered Ownership to: ' + config.owner)

  spinner.text = 'Waiting for Bounces to Complete'

  await tempAdmin.run({
    method: 'sendTransaction',
    params: {
      dest: locklift.giver.giver.address,
      value: 0,
      bounce: false,
      flags: 128 + 32,
      payload: ''
    },
    keyPair: tempAdmin.keyPair
  });

  spinner.stopAndPersist({ text: 'Swipe Complete' })

  await logContract(tokenRoot)
  console.log(`Admin: ${config.owner}`)
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
