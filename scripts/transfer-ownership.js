const ora = require('ora')
const prompts = require('prompts')
const fs = require('fs/promises')
const path = require('path')
const IPFS = require('ipfs-core')

const { deployMarket, deployAccount, deployTokenRoot, getAccount, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract, getTotalSupply } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {

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
            name: 'marketAddr',
            message: 'Market Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'text',
            name: 'newOwnerAddr',
            message: 'New Owner Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        
    ])

    const marketOwner = await getAccount(response, response.account)
    const market = await locklift.factory.getContract("Market")
    market.setAddress(response.marketAddr)
    const newOwner = response.newOwnerAddr;

    const confirm = await prompts([
        {
            type: 'confirm',
            name: 'continue',
            message: `Transfering to new owner ${newOwner}, Confirm`,
            initial: false
        }])

    if (!confirm.continue) return;
    console.log('Initiating Transfer...')

    await marketOwner.runTarget({
        contract: market,
        method: 'transferOwnership',
        params: {
          newOwner: newOwner
        },
        keyPair: marketOwner.keyPair,
        value: locklift.utils.convertCrystal(1, 'nano')
      })

      console.log(`Transfered Market(${market.address}) to new owner: ${ newOwner }`)
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
