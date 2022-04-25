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
            message: 'Get Sender Owner Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'text',
            name: 'public',
            message: 'Get Sender Owner Pubkey',
        },
        {
            type: 'text',
            name: 'secret',
            message: 'Get Sender Owner PrivateKey',
        },
        {
            type: 'text',
            name: 'reciever',
            message: 'Reciever Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        }
    ])

    const sender = await getAccount(response, response.account)
    const market = await locklift.factory.getContract("Market")
    market.setAddress(response.marketAddr)
    const reciever = response.reciever;

    const confirm = await prompts([
        {
            type: 'confirm',
            name: 'continue',
            message: `WARNING! Swiping all ever from ${response.account} to new ${reciever}, This is Irriversible, Please Confirm`,
            initial: false
        }])

    if (!confirm.continue) return;
    console.log('Initiating Transfer...')

    await sender.run({
        method: 'sendTransaction',
        params: {
          dest: reciever,
          value: 0,
          bounce: false,
          flags: 128,
          payload: ''
        },
        keyPair: sender.keyPair
      });

    console.log(`Sent ${response.amount} Ever to Account: ${response.reciever}`)
}


main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
