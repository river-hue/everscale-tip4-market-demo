const { expect } = require("chai")
const BigNumber = require("bignumber.js");
const { deployAccount, deployTokenRoot, deployMarket, deployTokenWallet, getTotalSupply, getNftById, getPurchaseCount } = require("./utils.js");

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
      tokenRoot = await deployTokenRoot(marketAccount, 'Test Token', 'TST', '4')
      market = await deployMarket(marketAccount, tokenRoot)

      return expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })

    it('Should Deploy Wallet Contract', async function () {
      this.timeout(800000);

      wallet1 = await deployTokenWallet(marketAccount, tokenRoot, 1000);

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
            // keyPair: marketAccount.keyPair,
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
        it('should not sell nft if less than price', async function () {
          this.timeout(20000)
          const nft = await locklift.factory.getContract("Nft");

          // Mint 2 NFT
          await Promise.all(Array(1).map((_, index) => marketAccount.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: `{"index": "${index}"}` },
            keyPair: marketAccount.keyPair,
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
              amount: 9,
              recipient: market.address,
              remainingGasTo: marketAccount.address,
              notify: true,
              deployWalletValue: 0,
              payload,
            },
            keyPair: marketAccount.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after = await getPurchaseCount(market)

          expect(after.toNumber()).to.be.equal(before.toNumber())
        })
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
            keyPair: marketAccount.keyPair,
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