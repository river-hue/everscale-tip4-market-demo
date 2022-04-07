const { expect } = require("chai")
const BigNumber = require("bignumber.js")

const getRandomNonce = () => Math.random() * 64000 | 0;

async function deployTokenRoot(name = 'Test', symbol = 'TST', decimals = '4') {

  const TokenRoot = await locklift.factory.getContract("TokenRoot")
  const TokenWallet = await locklift.factory.getContract("TokenWallet");

  const [keyPair] = await locklift.keys.getKeyPairs();
  let giverAddr = locklift.giver.giver.address;

  return await locklift.giver.deployContract({
    contract: TokenRoot,
    constructorParams: {
      initialSupplyTo: giverAddr,
      initialSupply: new BigNumber(10000000).shiftedBy(2).toFixed(),
      deployWalletValue: locklift.utils.convertCrystal('1', 'nano'),
      mintDisabled: false,
      burnByRootDisabled: false,
      burnPaused: false,
      remainingGasTo: locklift.utils.zeroAddress
    },
    initParams: {
      deployer_: locklift.utils.zeroAddress,
      randomNonce_: getRandomNonce(),
      rootOwner_: giverAddr,
      name_: name,
      symbol_: symbol,
      decimals_: decimals,
      walletCode_: TokenWallet.code,
    },
    keyPair,
  }, locklift.utils.convertCrystal('3', 'nano'));

}

async function deployMarket(tokenRoot) {
  const Market = await locklift.factory.getContract("Market")
  const Nft = await locklift.factory.getContract("Nft");
  const Index = await locklift.factory.getContract("Index")
  const IndexBasis = await locklift.factory.getContract("IndexBasis")

  const [keyPair] = await locklift.keys.getKeyPairs();
  let giverAddr = locklift.giver.giver.address;

  const ownerPubkey = "0x" + keyPair.public;

  return await locklift.giver.deployContract({
    contract: Market,
    constructorParams: {
      tokenRoot: tokenRoot.address,
      minNftTokenPrice: 10,
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      ownerPubkey: ownerPubkey
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'))

}

async function deployWallet(owner, tokenRoot, walletValue = 1000) {

  // let wallet = await tokenRoot.call({
  //   method: 'walletOf',
  //   params: {
  //     walletOwner: owner.public,
  //     answerId: 0
  //   }
  // });

  let wallet = await tokenRoot.run({
    method: 'deployWallet',
    params: {
      walletOwner: owner.public,
      deployWalletValue: 0,
      answerId: 0
    },
    keyPair: locklift.keys.getKeyPairs()[0]
  }, locklift.utils.convertCrystal(2, 'nano'));

  // await tokenRoot.run({
  //   method: 'mint',
  //   params: {
  //     amount: 100000,
  //     recipient: wallet.address,
  //     deployWalletValue: 100000,
  //     remainingGasTo: 0,
  //     notify: true,
  //     payload: locklift.utils.encode('')
  //   }
  // })

  return wallet;

}

function getTotalSupply(market) {
  return market.call({
    method: 'totalSupply',
    params: {
      answerId: 0
    }
  })
}

function getTokenWallet(market) {
  return market.call({
    method: 'tokenWallet',
    params: {
      answerId: 0
    }
  })
}

describe('Test Market contract', async function () {

  let market;
  let tokenRoot;
  let wallet1;

  describe('Contracts', async function () {
    it('Should Load contract factory', async function () {
      let Market = await locklift.factory.getContract("Market");

      expect(Market.code).not.to.equal(undefined, 'Code should be available');
      expect(Market.abi).not.to.equal(undefined, 'ABI should be available');
    })

    it('Should Deploy Market Contract', async function () {
      this.timeout(40000);

      const keyPairs = await locklift.keys.getKeyPairs();
      const user1 = keyPairs[1];

      tokenRoot = await deployTokenRoot('Test Token', 'TST', '4')
      market = await deployMarket(tokenRoot)

      return expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })

    it('Should Deploy Wallet Contract', async function () {
      this.timeout(40000);

      const keyPairs = await locklift.keys.getKeyPairs();
      const user1 = keyPairs[0];
      wallet1 = await deployWallet(user1, tokenRoot, 1000);

      expect(wallet.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })
  })

  describe('Market', async function () {
    describe('Purchase', function () {
      describe('.mintNft()', async function () {
        it('Should run', async function () {
          this.timeout(20000);
  
          const [keyPair, user1] = await locklift.keys.getKeyPairs();
          let before = await getTotalSupply(market)
  
          const res = await market.run({
            method: 'mintNft',
            params: { owner: market.address },
            keyPair,
          }, locklift.utils.convertCrystal(1000, 'nano'))
  
          let after = await getTotalSupply(market)
  
          expect(after).to.greaterThan(before)
        })
      })
      it('.onAcceptTokensTransfer', async function () {
        this.timeout(20000)
        const Nft = await locklift.factory.getContract("Nft");

        const keyPairs = await locklift.keys.getKeyPairs();
        const user1 = keyPairs[0];

        // Set NFT Owner
        let nftOwner = user1.address;

        let before = await getTotalSupply(market)

        // Run Purchase
        // This calls onAcceptTokensTransfer back to Market
        await wallet1.run({
          method: 'transferToWallet',
          params: {
            amount: 10,
            recipientTokenWallet: market._tokenWallet,
            remainingGasTo: user1.address,
            notify: true,
            payload: nftOwner
          },
          keyPair: user1
        }, locklift.utils.convertCrystal(2, 'nano'))

        let after = await getTotalSupply(market)

        let nftAddr = await market.call({
          method: 'nftAddress',
          params: {
            id: after,
            answerId: 0
          }
        })

        let nft = new Nft()
        nft.setAddress(nftAddr)
        nft.setKeyPair(user1)





        expect(after).to.greaterThan(before)
      })
    })
  })
})

// describe.skip('Test Sample contract', async function () {

//   let Sample;
//   let sample;

//   describe('Contracts', async function () {
//     it('Load contract factory', async function () {
//       Sample = await locklift.factory.getContract('Sample');

//       expect(Sample.code).not.to.equal(undefined, 'Code should be available');
//       expect(Sample.abi).not.to.equal(undefined, 'ABI should be available');
//     });

//     it('Deploy contract', async function () {
//       this.timeout(20000);

//       const [keyPair] = await locklift.keys.getKeyPairs();

//       sample = await locklift.giver.deployContract({
//         contract: Sample,
//         constructorParams: {
//           _state: 123
//         },
//         initParams: {
//           _nonce: getRandomNonce(),
//         },
//         keyPair,
//       });

//       expect(sample.address).to.be.a('string')
//         .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
//     });

//     it('Interact with contract', async function () {
//       await sample.run({
//         method: 'setState',
//         params: { _state: 111, _random: "" },
//       });

//       const response = await sample.call({
//         method: 'getDetails',
//         params: {},
//       });

//       expect(response.toNumber()).to.be.equal(111, 'Wrong state');
//     });
//   });
// });
