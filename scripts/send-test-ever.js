// @ts-check
const ora = require('ora')
const prompts = require('prompts')
const fs = require('fs/promises')
const path = require('path')
const IPFS = require('ipfs-core')

const { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
    const [keyPair] = await locklift.keys.getKeyPairs();
    const reciever = await locklift.factory.getAccount("Wallet");
    
    const response = await prompts([
        {
            type: 'text',
            name: 'address',
            message: 'Account Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Amount of Ever to Send',
            initial: 1
        }
    ])

    reciever.setAddress(response.address)
    let temp = await deployAccount(keyPair, response.amount)
    console.log('TempAccount', temp.address, temp.keyPair)
    await temp.run({
        method: 'sendTransaction',
        params: {
          dest: response.address,
          value: 0,
          bounce: false,
          flags: 128,
          payload: ''
        },
        keyPair: keyPair
      });

    console.log(`Sent ${response.amount} Nano to Account: ${response.address}`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
