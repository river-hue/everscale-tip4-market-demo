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

  return await locklift.giver.deployContract({
    contract: Market,
    constructorParams: {
      tokenRoot: tokenRoot.address,
      minNftTokenPrice: 10,
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      ownerPubkey: account.address,
    },
    initParams: {
      _remainOnNft: 0
    },
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

function getPurchaseCount(market) {
  return market.call({
    method: 'purchaseCount',
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

async function getNftById(market, id) {
  let nft = await locklift.factory.getContract("Nft")
  let nftAddr = await market.call({
    method: 'nftAddress',
    params: { id, answerId: 0 }
  });

  nft.setAddress(nftAddr)

  return nft;
}

describe('Test Market contract', async function () {

  let market;
  let tokenRoot;
  let wallet1;
  let marketAccount;

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

      marketAccount = await deployAccount(user1, 100)
      marketAccount.setKeyPair(user1)

      tokenRoot = await deployTokenRoot(user1, marketAccount, 'Test Token', 'TST', '4')
      market = await deployMarket(user1, marketAccount, tokenRoot)

      let owner = await market.call({
        method: 'owner',
        params: { answerId: 0 },
      });

      // owner = owner.toFixed()

      return expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })

    it('Should Deploy Wallet Contract', async function () {
      this.timeout(800000);

      const keyPairs = await locklift.keys.getKeyPairs();
      const user1 = keyPairs[0];
      wallet1 = await deployTokenWallet(user1, marketAccount, tokenRoot, 1000);

      expect(wallet1.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })
  })

  describe('Market', async function () {
    describe('Owner', function () {
      describe('.mintNft()', async function () {
        it('Should mint new Nft', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();
          const user1 = keyPairs[0];

          let ex_json = "{name:'Jerry'}";
          let before = await getTotalSupply(market)
          let nftId = before.toNumber();
          let nft = await getNftById(market, nftId)

          const account2 = await deployAccount(keyPairs[1], 100)

          const res = await marketAccount.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: account2.address, json: ex_json },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          const res_json = await nft.call({
            method: 'getJson',
            params: { answerId: 0 }
          })

          let after = await getTotalSupply(market)
          expect(res_json).to.equal(ex_json)
          expect(after.toNumber()).to.be.greaterThan(before.toNumber())
        })

        it('should reject if not owner', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();
          const user2 = keyPairs[1];
          const account2 = await deployAccount(user2, 100)

          let ex_json = "{name:'Jerry'}";
          let before = await getTotalSupply(market)
          let nftId = before.toNumber();
          let nft = await getNftById(market, nftId)

          const res = await account2.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: marketAccount.address, json: ex_json },
            keyPair: user2,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after = await getTotalSupply(market)
          expect(after.toNumber()).to.be.equal(before.toNumber())
        })
      })
    })
    describe('Purchase', function () {
      describe('.onAcceptTokensTransfer', function () {
        it('should sell nft if in order', async function () {
          this.timeout(20000)
          const nft = await locklift.factory.getContract("Nft");

          const keyPairs = await locklift.keys.getKeyPairs();
          const user1 = keyPairs[0];

          // Mint 2 NFT
          await Promise.all(Array(1).map((_, index) => marketAccount.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: `{"index": "${index}"}` },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })))


          // Set NFT Owner
          let nftOwner = marketAccount.address;
          let before = await getPurchaseCount(market)

          let payload = await market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: nftOwner,
            }
          })

          // Run Purchase
          // This calls onAcceptTokensTransfer back to Market
          await marketAccount.runTarget({
            contract: wallet1,
            method: 'transfer',
            params: {
              amount: 11,
              recipient: market.address,
              remainingGasTo: marketAccount.address,
              notify: true,
              deployWalletValue: 0,
              payload,
            },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after = await getPurchaseCount(market)
          let nftAddr = await getNftById(market, after)

          nft.setAddress(nftAddr)
          nft.setKeyPair(user1)

          expect(after.toNumber()).to.be.greaterThan(before.toNumber())
        })

        it('should not sell nft if not in order', async function () {
          const keyPairs = await locklift.keys.getKeyPairs();
          const user1 = keyPairs[0];

          let ex_json = "{name:'Jerry'}";
          let curr_supply = await getTotalSupply(market)
          let curr_count = await getPurchaseCount(market)

          const res = await marketAccount.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: marketAccount.address, json: ex_json },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          // Set NFT Owner
          let nftOwner = marketAccount.address;

          let setPayload = (i) => market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: nftOwner,
              json: `{"index":"${i}"}`
            }
          })

          // Run Purchase Higher Than Count
          // This calls onAcceptTokensTransfer back to Market
          Promise.all(Array(curr_supply + 1).map(async (_, index) => marketAccount.runTarget({
            contract: wallet1,
            method: 'transfer',
            params: {
              amount: 11,
              recipient: market.address,
              remainingGasTo: marketAccount.address,
              notify: true,
              deployWalletValue: 0,
              payload: await setPayload(index)
            },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })))

          let curr_count_after = await getPurchaseCount(market)

          expect(curr_count_after.toNumber()).to.be.equal(curr_supply.toNumber())
        })
      })
    })
  })
})