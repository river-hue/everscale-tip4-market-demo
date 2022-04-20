const ora = require('ora')
const prompts = require('prompts')
const fs = require('fs/promises')
const path = require('path')
const IPFS = require('ipfs-core')

const { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract, getTotalSupply } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

async function main() {
    const [keyPair] = await locklift.keys.getKeyPairs();
    // Deploy TempAccount
    let tempAdmin = await deployAccount(keyPair, 100)

    const response = await prompts([
        {
            type: 'text',
            name: 'public',
            message: 'Get Market Owner Pubkey',
            initial: tempAdmin.keyPair.public
        },
        {
            type: 'text',
            name: 'secret',
            message: 'Get Market Owner PrivateKey',
            initial: tempAdmin.keyPair.secret
        },
        {
            type: 'text',
            name: 'marketAddr',
            message: 'Market Address',
            validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        },
        {
            type: 'text',
            name: 'folder',
            message: 'Provide a folder of NFT/*.png/*.jpeg to Deploy',
            validate: folder => path.extname(folder) === ''
        }
    ])

    const marketAccount = response.secret == tempAdmin.keyPair.secret ? tempAdmin : await deployAccount(response, 100)
    const folderPath = path.resolve('.', response.folder)
    const market = await locklift.factory.getContract("Market")
    market.setAddress(response.marketAddr)

    const spinner = ora('Deploying NFT').start();

    spinner.text = 'Reading Folder';
    let folder = await fs.readdir(folderPath)
    let filesPromise = folder
        .filter(p => path.extname(p) === '.png' || path.extname(p) === '.jpg')
        .map(async name => {
            let imagePath = path.resolve(folderPath, name)
            let buff = await fs.readFile(imagePath)
            return {
                path: path.basename(name),
                content: buff,
                // mode: undefined,
                // mtime: undefined,
            }
        })
    let files = await Promise.all(filesPromise);

    spinner.frame()

    spinner.text = 'Storing to IPFS'
    const ipfs = await IPFS.create();
    
    let results = []
    for await (const item of ipfs.addAll(files)) {
        spinner.text = `Storing IPFS ${results.length}/${files.length}: "${item.path}" cid:${item.cid}`;
        results.push(item)
    }

    spinner.text = 'Minting NFTS to Market'
    const tx_results = []
    for (const [i, result] of results.entries()) {
        let payload = JSON.stringify(result)
        spinner.text = `Minting NFT ${i}/${results.length}: ${result.path}:`
        let tx = await marketAccount.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: payload },
            keyPair: marketAccount.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
        })
        spinner.text = `Minted NFT ${i}/${results.length}: ${result.path}: Tx: ${tx.transaction.id}`
        tx_results.push({txStatus: tx.transaction.status_name, txId: tx.transaction.id, json: payload})
    }
    spinner.stopAndPersist({text: 'Minting Completed, Outputting Result'})
    console.log(tx_results)
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
