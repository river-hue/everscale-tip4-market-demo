const ora = require('ora')
const prompts = require('prompts')
const fs = require('fs/promises')
const path = require('path')
const IPFS = require('ipfs-core')

const { deployMarket, deployAccount, getAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
    const [keyPair] = await locklift.keys.getKeyPairs();
    const reciever = await locklift.factory.getAccount("Wallet");
    let tempAdmin = await deployAccount(keyPair, 100)
    console.log(tempAdmin.address)

    const response = await prompts([
        {
            type: 'text',
            name: 'address',
            message: 'Get TokenRoot Owner Address',
            initial: tempAdmin.address,
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'text',
            name: 'public',
            message: 'Get TokenRoot Owner Pubkey',
            initial: tempAdmin.keyPair.public
        },
        {
            type: 'text',
            name: 'secret',
            message: 'Get TokenRoot Owner PrivateKey',
            initial: tempAdmin.keyPair.secret
        },
        {
            type: 'text',
            name: 'tokenroot',
            message: 'TokenRoot Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'text',
            name: 'recipient',
            message: 'Account Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'number',
            name: 'amount',
            message: 'Amount of Tokens to Send',
            initial: 100
        }
    ])
    
    // const tokenOwner = response.secret == tempAdmin.keyPair.secret ? tempAdmin : await deployAccount(response, 100)
    
    const tokenRoot = await locklift.factory.getContract("TokenRoot")
    tokenRoot.setAddress(response.tokenroot)

    async function checkOwner() {
        let rootOwnerAddr = await tokenRoot.call({
            method: 'rootOwner',
            params: { answerId: 0}
        })
        return rootOwnerAddr
    }
    console.log(await checkOwner())
    const tokenOwner = await getAccount(response, response.address);

    await tokenOwner.runTarget({
        contract: tokenRoot,
        method: 'mint',
        params: {
            amount: response.amount,
            recipient: response.recipient,
            deployWalletValue: locklift.utils.convertCrystal('0.1', 'nano'),
            remainingGasTo: tokenOwner.address,
            notify: true,
            payload: '',
        },
        value: locklift.utils.convertCrystal(10, 'nano'),
        keyPair: tokenOwner.keyPair
    })

    console.log(`Minted ${response.amount} Tokens to Account: ${response.recipient}`)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
