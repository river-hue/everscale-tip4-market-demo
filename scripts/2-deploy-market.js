// @ts-check
const ora = require('ora')
const prompts = require('prompts')
const path = require('node:path')

const { deployMarket, deployAccount, deployTokenRoot, getAccount, Contract, LockLift, getRandomNonce, isValidTonAddress, logContract, getTotalSupply, batchMintNft, Nft } = require('../test/utils')

/** @type {LockLift} */
var locklift = global.locklift;

const INCREMENT = 20;

async function main() {
  const [keyPair] = await locklift.keys.getKeyPairs();
  const giverAddress = locklift.giver.giver.address;

  const response = await prompts([
    {
      type: 'text',
      name: 'owner',
      message: 'Get Market Owner Address',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'text',
      name: 'tokenRoot',
      message: 'TokenRoot Address',
      validate: value => isValidTonAddress(value) ? true : 'Invalid Everscale address'
    },
    {
      type: 'number',
      name: 'nftPrice',
      message: 'Price of Nft in Tokens',
      initial: 10000000000
    },
    {
      type: 'text',
      name: 'nftName',
      message: 'Provide the nft name'
    },
    {
      type: 'text',
      name: 'nftDescription',
      message: 'Provide the nft description'
    },
    {
      type: 'text',
      name: 'nftUrl',
      message: 'Provide the image url'
    },
    {
      type: 'number',
      name: 'nftAmount',
      message: 'Provide how many copies to deploy',
      initial: 1
    },
  ])

  let config = {
    owner: response.owner,
    tokenRoot: response.tokenRoot,
    nftPrice: response.nftPrice,
    nftName: response.nftName,
    nftDescription: response.nftDescription,
    nftUrl: response.nftUrl,
    nftAmount: response.nftAmount
  }


  let tokenRoot = await locklift.factory.getContract("TokenRoot")
  tokenRoot.setAddress(config.tokenRoot)

  const tx_results = []
  /** @type {number} **/
  const amount = config.nftAmount;
  let k = Math.floor(amount / INCREMENT)
  let rem = amount % INCREMENT;

  const tempAdmin = await deployAccount(keyPair, Math.floor(amount * 3.4) + 5);
  console.log(`Deployed TempAdmin with ${Math.floor(amount * 3.4) + 1} ever`)
  console.log(`TempAdmin Account: ${tempAdmin.address}`)
  console.log(`TempAdmin Public`, tempAdmin.keyPair.public)
  console.log(`TempAdmin Key`, tempAdmin.keyPair.secret)

  const spinner = ora('Deploying Market').start();
  let market = await deployMarket(tempAdmin, tokenRoot, { minNftTokenPrice: config.nftPrice, remainOnNft: 0.3 })
  await logContract(market)

  spinner.text = 'Deploying Nfts'
  const nfts = Array(amount).fill(0).map((_,id) => ({
    id,
    type: 'Basic Nft',
    name: config.nftName,
    description: config.nftDescription,
    preview: {
      source: config.nftUrl,
      mimetype: `image/${path.extname(config.nftUrl).substring(1)}`
    },
    files: [{
      source: config.nftUrl,
      mimetype: `image/${path.extname(config.nftUrl).substring(1)}`
    }],
    external_url: "",
  }))

  console.log(nfts)
  try {

    for (let i = 0; i < amount; i += INCREMENT) {
      spinner.text = `Minting NFT ${i}/${amount}: ${config.nftUrl}:`
      let nftSlice = nfts.slice(i, i + INCREMENT);

      let tx = await batchMintNft(market, tempAdmin, nftSlice);
      spinner.text = `Minted NFT ${(i + 1) * INCREMENT}/${amount}: Tx: ${tx.transaction.id}`
      tx_results.push({ txStatus: tx.transaction.status_name, txId: tx.transaction.id, jsons: nftSlice.map(m => JSON.stringify(m)) })
    }
  } catch (e) {
    console.error(e)
  }

  spinner.text = 'Minting Completed, Outputting Result Transfering to Owner'

  await tempAdmin.runTarget({
    contract: market,
    method: 'transferOwnership',
    params: {
      newOwner: config.owner
    },
    keyPair: tempAdmin.keyPair,
    value: locklift.utils.convertCrystal(1, 'nano')
  })

  console.log('Transfered Ownership to: ' + config.owner)

  spinner.text = `Swiping Temporary Admin: ${tempAdmin.address} back to Giver ${giverAddress}`

  await new Promise(r => setTimeout(r, 10000))
  spinner.text = 'Waiting for Bounces to Complete'

  await tempAdmin.run({
    method: 'sendTransaction',
    params: {
      dest: giverAddress,
      value: 0,
      bounce: false,
      flags: 128,
      payload: ''
    },
    keyPair: tempAdmin.keyPair
  });

  spinner.stopAndPersist({text: 'Swipe Complete'})

  await logContract(market)
  console.log(tx_results)

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
