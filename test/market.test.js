const { expect } = require("chai")
const BigNumber = require("bignumber.js")

const getRandomNonce = () => Math.random() * 64000 | 0;
const EMPTY_TVM_CELL = 'te6ccgEBAQEAAgAAAA=='


async function deployAccount(keyPair, balance) {
  const account = await locklift.factory.getAccount("Wallet")

  await locklift.giver.deployContract({
    contract: account,
    constructorParams: {},
    initParams: {
      _randomNonce: Math.random() * 6400 | 0,
    },
    keyPair,
  }, locklift.utils.convertCrystal(balance, 'nano'));

  return account;
}

async function deployTokenRoot(keyPair, account, name = 'Test', symbol = 'TST', decimals = '4') {

  const TokenRoot = await locklift.factory.getContract("TokenRoot")
  const TokenWallet = await locklift.factory.getContract("TokenWallet");

  return await locklift.giver.deployContract({
    contract: TokenRoot,
    constructorParams: {
      initialSupplyTo: account.address,
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
      rootOwner_: account.address,
      name_: name,
      symbol_: symbol,
      decimals_: decimals,
      walletCode_: TokenWallet.code,
    },
    keyPair,
  }, locklift.utils.convertCrystal('3', 'nano'));

}

async function deployMarket(keyPair, account, tokenRoot) {
  const Market = await locklift.factory.getContract("Market")
  const Nft = await locklift.factory.getContract("Nft");
  const Index = await locklift.factory.getContract("Index")
  const IndexBasis = await locklift.factory.getContract("IndexBasis")

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

async function deployTokenWallet(keyPair, account, tokenRoot) {

  let walletAddr = await tokenRoot.call({
    method: 'walletOf',
    params: {
      walletOwner: account.address,
      answerId: 0
    }
  });

  await account.runTarget({
    contract: tokenRoot,
    method: 'deployWallet',
    params: {
      walletOwner: account.address,
      deployWalletValue: locklift.utils.convertCrystal(0.1, 'nano'),
      answerId: 0
    },
    value: locklift.utils.convertCrystal(0.5, 'nano'),
    keyPair
  });

  const TokenWallet = await locklift.factory.getContract("TokenWallet")
  TokenWallet.setAddress(walletAddr);

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

  return TokenWallet;

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
  let account;

  describe('Contracts', async function () {
    it('Should Load contract factory', async function () {
      let Market = await locklift.factory.getContract("Market");

      expect(Market.code).not.to.equal(undefined, 'Code should be available');
      expect(Market.abi).not.to.equal(undefined, 'ABI should be available');
    })

    it('Should Deploy Market Contract', async function () {
      this.timeout(800000);

      const keyPairs = await locklift.keys.getKeyPairs();
      const user1 = keyPairs[0];

      account = await deployAccount(user1, 100)
      tokenRoot = await deployTokenRoot(user1, account, 'Test Token', 'TST', '4')
      market = await deployMarket(user1, account, tokenRoot)

      return expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })

    it('Should Deploy Wallet Contract', async function () {
      this.timeout(800000);

      const keyPairs = await locklift.keys.getKeyPairs();
      const user1 = keyPairs[0];
      wallet1 = await deployTokenWallet(user1, account, tokenRoot, 1000);

      expect(wallet1.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })
  })

  describe('Market', async function () {
    describe('Purchase', function () {
      describe('.mintNft()', async function () {
        it('Should run', async function () {
          this.timeout(20000);
          
          const keyPairs = await locklift.keys.getKeyPairs();
          const user1 = keyPairs[0];

          let before = await getTotalSupply(market)
  
          const res = await account.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: account.address },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

  
          let after = await getTotalSupply(market)
  
          expect(after.toNumber()).to.be.greaterThan(before.toNumber())
        })
      })
      it('.onAcceptTokensTransfer', async function () {
        this.timeout(20000)
        const nft = await locklift.factory.getContract("Nft");
        
        const keyPairs = await locklift.keys.getKeyPairs();
        const user1 = keyPairs[0];

        // Set NFT Owner
        let nftOwner = account.address;

        let before = await getTotalSupply(market)
        let payload = await market.call({
          method: '_serializeNftPurchase',
          params: {
            recipient: nftOwner,
          }
        })

        // Run Purchase
        // This calls onAcceptTokensTransfer back to Market
         await account.runTarget({
          contract: wallet1,
          method: 'transfer',
          params: {
            amount: 11,
            recipient: market.address,
            remainingGasTo: account.address,
            notify: true,
            deployWalletValue: 0,
            payload,
          },
          keyPair: user1,
          value: locklift.utils.convertCrystal(2, 'nano')
        })

        let after = await getTotalSupply(market)

        let nftAddr = await market.call({
          method: 'nftAddress',
          params: {
            id: after,
            answerId: 0
          }
        })

        nft.setAddress(nftAddr)
        nft.setKeyPair(user1)

        expect(after.toNumber()).to.be.greaterThan(before.toNumber())
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
