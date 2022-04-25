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
        // {
        //     type: 'text',
        //     name: 'file',
        //     message: 'Provide a file of NFT/*.png/*.jpeg to Deploy',
        //     validate: p => path.extname(p)=== '.png' || path.extname(p) === '.jpg'
        // },
        {
            type: 'text',
            name: 'name',
            message: 'Provide the nft name'
        },
        {
            type: 'text',
            name: 'description',
            message: 'Provide the nft description'
        },
        {
            type: 'text',
            name: 'url',
            message: 'Provide the image url'
        },
        {
            type: 'number',
            name: 'copyamount',
            message: 'Provide how many copies to deploy',
            initial: 1
        },
        // {
        //     type: 'text',
        //     name: 'folder',
        //     message: 'Provide a folder of NFT/*.png/*.jpeg to Deploy',
        //     validate: folder => path.extname(folder) === ''
        // }
    ])

    await deployFile(response)
}

async function deployFile(response) {
    const marketOwner = await getAccount(response, response.account)
    // const filePath = path.resolve('.', response.file)
    const market = await locklift.factory.getContract("Market")
    market.setAddress(response.marketAddr)
    const amount = response.copyamount
    const nft_url = response.url
    const nft_name = response.name
    const nft_description = response.description
    const spinner = ora('Deploying NFT').start();

    // let buff = await fs.readFile(filePath)
    // let file = {
    //     path: path.basename(filePath),
    //     content: buff
    //     // mode: undefined,
    //     // mtime: undefined
    // }
    // spinner.frame()
    // spinner.text = 'Storing to IPFS'
    // const ipfs = await IPFS.create();

    // let raw_res = await ipfs.add(file)
    // console.log(`Storing IPFS "${raw_res.path}" cid:${raw_res.cid.toString()}`);

    // raw_res.cid.toString();
    


    spinner.text = 'Minting Nfts to Market'
    
    let start = await getTotalSupply(market)

    start = start.toNumber()
    console.log(start)
    let sample = 1+start;
    console.log(`Start at:${sample}`)

    const tx_results = []
    for (let i = 0; i < amount; i++) {
        let item = {
            id: i + start,
            name: nft_name,
            description: nft_description,
            image_url: nft_url,
            // ipfs: raw_res.cid.toString()
        }
        spinner.text = `Minting NFT ${i+start}/${amount+start}: ${item.image_url}:`
        let payload = JSON.stringify(item)
        let tx = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: payload },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(0.7, 'nano')
        })
        // spinner.text = `Minted NFT ${i}/${amount}: ${item.image_url}: Tx: ${tx.transaction.id}`
        console.log(`Minted NFT ${i}/${amount}: ${item.image_url}: Tx: ${tx.transaction.id}`)
        tx_results.push({txStatus: tx.transaction.status_name, txId: tx.transaction.id, json: payload})
    } 
    spinner.stopAndPersist({text: 'Minting Completed, Outputting Result'})
    console.log(tx_results)
}

async function deployFolder(response) {
    const marketOwner = await getAccount(response, response.account)
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
        let tx = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: payload },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(4, 'nano')
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
