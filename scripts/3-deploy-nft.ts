import ora = require('ora')
import prompts = require('prompts')
import fs = require('fs/promises')
import path = require('path')
import IPFS = require('ipfs-core')

import { deployMarket, deployAccount, deployTokenRoot, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract } from '../test/utils'

declare var locklift: LockLift;

async function main() {
    const [keyPair] = await locklift.keys.getKeyPairs();

    const response = await prompts([
        // {
        //   type: 'text',
        //   name: 'owner pubkey',
        //   message: 'Get Market owner',
        //   validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        // },
        // {
        //   type: 'text',
        //   name: 'owner privateKey',
        //   message: 'Market Address',
        //   validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
        // },
        {
            type: 'text',
            name: 'folder',
            message: 'Provide a folder of NFT/*.png/*.jpeg to Deploy',
            validate: folder => path.extname(folder) === ''
        }
    ])

    let config = {
        owner: response.owner,
        market: response.market,
        folder: path.resolve('.', response.folder),
    }

    // let tempAdmin = await deployAccount(keyPair, 100)
    // let market = await locklift.factory.getContract("Market")
    // market.setAddress(config.market)

    console.log(config)


    const spinner = ora('Deploying NFT').start();

    spinner.text = 'Reading Folder';
    let folder = await fs.readdir(config.folder)
    let files = await Promise.all(folder.filter(p => path.extname(p) === 'png' || path.extname(p) === 'jpg').map(async imagePath => {
        let buff = await fs.readFile(imagePath)
        return {
            path: path.basename(imagePath),
            content: buff,
            // mode: undefined,
            // mtime: undefined,
        }
    }))

    spinner.text = 'Storing to IPFS'
    const ipfs = await IPFS.create();
    let result = []
    for await (const item of ipfs.addAll(files)) {
        spinner.text = `Storing  '${item.path} to ${item.cid}`;
        console.log(item)
        result.push(item)
    }


    // await logContract(market)

}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.log(e);
        process.exit(1);
    });
