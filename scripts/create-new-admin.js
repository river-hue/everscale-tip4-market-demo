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
    
    const response = await prompts([
        {
            type: 'number',
            name: 'amount',
            message: 'Amount of Ever for Admin',
            initial: 1
        }
    ])

    let temp = await deployAccount(keyPair, response.amount)
    console.log('TempAccount', temp.address)
    console.log(temp.keyPair)
    console.log(`Sent ${response.amount} Nano to Account: ${temp.address}`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
