const { expect } = require("chai");
const { deployAccount, deployTokenRoot, deployMarket, deployTokenWallet, LockLift, Account, Contract, getTokenWallet, logContract, getTotalSupply, getNftById, getPurchaseCount, getRandomNonce } = require("./utils");

/** @type {LockLift} */
var locklift = global.locklift;

describe('Test Market contract', async function () {
  /** @type {Contract} */
  let market;
  /** @type {Contract} */
  let tokenRoot;
  /** @type {Contract} */
  let marketOwnerWallet;
  /** @type {Account} */
  let marketOwner;

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

      marketOwner = await deployAccount(user1, 100)
      tokenRoot = await deployTokenRoot(marketOwner, { name: 'Test Token', symbol: 'TST', decimals: '4' })
      market = await deployMarket(marketOwner, tokenRoot, { remainOnNft: 0.3, minNftTokenPrice: 10 })

      return expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })

    it('Should Deploy Wallet Contract', async function () {
      this.timeout(800000);

      marketOwnerWallet = await deployTokenWallet(marketOwner, tokenRoot);

      expect(marketOwnerWallet.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })
  })

  describe('Market', function () {
    describe('Owner', function () {
      describe('batchTransferNft()', function () {
        it('should transferOwnership nft to reciever iff owner', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{nonce: "${getRandomNonce()}"}`
          let before = await getPurchaseCount(market)
          let beforeSupply = await getTotalSupply(market)

          const account2 = await deployAccount(keyPairs[1], 100)

          for (let i = 0; i < 4; i++) {
            await marketOwner.runTarget({
              contract: market,
              method: 'mintNft',
              params: { owner: market.address, json: ex_json },
              keyPair: marketOwner.keyPair,
              value: locklift.utils.convertCrystal(4, 'nano')
            })
          }

          await marketOwner.runTarget({
            contract: market,
            method: 'batchTransferNft',
            params: { newOwner: account2.address, remainingGasTo: marketOwner.address, amount: 4 },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(25, 'nano')
          })

          let after = await getPurchaseCount(market)
          expect(after.toNumber()).to.be.greaterThan(before.toNumber())
          
          let start = before.toNumber()
          for (let i = 0; i < 4; i++) {
            let nft = await getNftById(market, start + i)
            let resInfo = await nft.call({
              method: 'getInfo',
              params: { answerId: 0 }
            })
            expect(resInfo.owner).to.equal(account2.address)
            expect(resInfo.manager).to.equal(account2.address)

          }
        })
        it('should reject if not owner', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{nonce: "${getRandomNonce()}"}`
          let before = await getPurchaseCount(market)
          let nftId = before.toNumber();

          let nft = await getNftById(market, nftId)

          const account2 = await deployAccount(keyPairs[1], 100)

          const res = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: ex_json },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          await account2.runTarget({
            contract: market,
            method: 'batchTransferNft',
            params: { newOwner: account2.address, remainingGasTo: marketOwner.address, amount: 1 },
            keyPair: account2.keyPair,
            value: locklift.utils.convertCrystal(10, 'nano')
          })

          let resInfo = await nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })

          expect(resInfo.owner).to.not.equal(account2.address)
          expect(resInfo.manager).to.not.equal(account2.address)
        })
      })
      describe('transferNft()', function () {
        it('should transferOwnership nft to reciever iff owner', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{nonce: "${getRandomNonce()}"}`
          let before = await getPurchaseCount(market)
          let nftId = before.toNumber();

          let nft = await getNftById(market, nftId)

          const account2 = await deployAccount(keyPairs[1], 100)

          await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: ex_json },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(4, 'nano')
          })

          await marketOwner.runTarget({
            contract: market,
            method: 'transferNft',
            params: { newOwner: account2.address, remainingGasTo: marketOwner.address },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(10, 'nano')
          })

          let resInfo = await nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })

          let after = await getPurchaseCount(market)

          expect(after.toNumber()).to.be.greaterThan(before.toNumber())
          expect(resInfo.owner).to.equal(account2.address)
          expect(resInfo.manager).to.equal(account2.address)

        })
        it('should reject if not owner', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{nonce: "${getRandomNonce()}"}`
          let before = await getPurchaseCount(market)
          let nftId = before.toNumber();

          let nft = await getNftById(market, nftId)

          const account2 = await deployAccount(keyPairs[1], 100)

          const res = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: ex_json },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          await account2.runTarget({
            contract: market,
            method: 'transferNft',
            params: { newOwner: account2.address, remainingGasTo: marketOwner.address, amount: 1 },
            keyPair: account2.keyPair,
            value: locklift.utils.convertCrystal(10, 'nano')
          })

          let resInfo = await nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })

          expect(resInfo.owner).to.not.equal(account2.address)
          expect(resInfo.manager).to.not.equal(account2.address)
        })
      })
      describe('transferEver()', function () {
        it('should transfer Ever to owner iff owner', async function () {
          this.timeout(20000);

          let previousOwner = await locklift.ton.getBalance(marketOwner.address)
          let previousMarket = await locklift.ton.getBalance(market.address)

          const withdraw = 2000;

          await marketOwner.runTarget({
            contract: market,
            method: 'transferEver',
            params: {
              value: withdraw,
              flag: 1,
              bounce: false
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(1, 'nano')
          })

          let afterOwner = await locklift.ton.getBalance(marketOwner.address)
          let afterMarket = await locklift.ton.getBalance(market.address)

          expect(Math.abs(afterOwner.toNumber()-previousOwner.toNumber())).to.greaterThanOrEqual(withdraw)
          expect(Math.abs(afterMarket.toNumber()-previousMarket.toNumber())).to.greaterThanOrEqual(withdraw)
        })
        it('should reject if not owner', async function () {
          this.timeout(20000);

          let previousMarket = await locklift.ton.getBalance(market.address)
          const keyPairs = await locklift.keys.getKeyPairs();

          const withdraw = 2000000;
          const attacker = await deployAccount(keyPairs[5], 100)

          await attacker.runTarget({
            contract: market,
            method: 'transferEver',
            params: {
              value: withdraw,
              flag: 1,
              bounce: false
            },
            keyPair: attacker.keyPair,
            value: locklift.utils.convertCrystal(1, 'nano')
          })

          let afterMarket = await locklift.ton.getBalance(market.address)

          // expect(Math.abs(afterOwner.toNumber()-previousOwner.toNumber())).to.be.lessThan(withdraw)
          expect(Math.abs(afterMarket.toNumber()-previousMarket.toNumber())).to.be.lessThan(50)
        })
      })
      describe('.transfer()', function () {
        it('should transfer tokens from MarketAccount', async function () {
          this.timeout(20000);

          let marketWallet = await getTokenWallet(market);

          let start_acc = await marketOwnerWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })
          let start_market = await marketWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })

          let payload = await market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: locklift.utils.zeroAddress,
            }
          })

          // Send Tokens from MarketAccount to MarketWallet
          // This calls onAcceptTokensTransfer back to Market
          await marketOwner.runTarget({
            contract: marketOwnerWallet,
            method: 'transfer',
            params: {
              amount: 8,
              recipient: market.address,
              remainingGasTo: marketOwner.address,
              notify: false,
              deployWalletValue: 0,
              payload: payload,
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(4, 'nano')
          })

          let prev_acc = await marketOwnerWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })
          let prev_market = await marketWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })

          expect(prev_acc.toNumber()).to.equal(start_acc.toNumber() - 8)
          expect(prev_market.toNumber()).to.equal(start_market.toNumber() + 8)

          // Send Tokens Back to MarketAccount
          await marketOwner.runTarget({
            contract: market,
            method: 'transfer',
            params: {
              amount: 7,
              // recipient: marketAccount.address,
              // remainingGasTo: marketAccount.address,
              // notify: false,
              // deployWalletValue: 0,
              // payload: payload,
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after_acc = await marketOwnerWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })
          let after_market = await marketWallet.call({
            method: 'balance',
            params: { answerId: 0 }
          })

          // Check Transfer
          expect(after_acc.toNumber()).to.equal(prev_acc.toNumber() + 7)
          expect(after_market.toNumber()).to.equal(prev_market.toNumber() - 7)

        })
      })
      describe('.batchMintNft()', async function () {
        it('Should mint new Nft', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{"nonce": "${getRandomNonce()}"}`
          let before = await getTotalSupply(market)

          await marketOwner.runTarget({
            contract: market,
            method: 'batchMintNft',
            params: {
              jsons: Array(4).fill(ex_json),
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(13, 'nano')
          })

          let after = await getTotalSupply(market)
          expect(after.toNumber()).to.equal(before.toNumber() + 4)

          let start = before.toNumber()
          for (let i = 0; i < 4; i++) {
            let nft = await getNftById(market, start + i)

            const res_json = await nft.call({
              method: 'getJson',
              params: { answerId: 0 }
            })
            const res_info = await nft.call({
              method: 'getInfo',
              params: { answerId: 0 }
            })

            expect(res_json).to.equal(ex_json)
            expect(res_info.owner).to.equal(market.address)
          }
        })
      })
      describe('.mintNft()', async function () {
        it('Should mint new Nft', async function () {
          this.timeout(20000);

          const keyPairs = await locklift.keys.getKeyPairs();

          let ex_json = `{"nonce": "${getRandomNonce()}","random": "blarg"}`
          let before = await getTotalSupply(market)
          let nftId = before.toNumber();

          let nft = await getNftById(market, nftId)

          await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: ex_json },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after = await getTotalSupply(market)
          expect(after.toNumber()).to.be.greaterThan(before.toNumber())

          const res_json = await nft.call({
            method: 'getJson',
            params: { answerId: 0 }
          })
          const res_info = await nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })
          expect(res_json).to.equal(ex_json)
          expect(res_info.owner).to.equal(market.address)
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
            params: { owner: marketOwner.address, json: ex_json },
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

          // Mint 2 NFT
          const res1 = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: '{"id": "1"}' },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          const res2 = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: market.address, json: '{"id": "2"}' },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          // Set NFT Owner
          let nftOwner = marketOwner.address;
          let before = await getPurchaseCount(market)

          let payload = await market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: nftOwner,
            }
          })

          // Run Purchase
          // This calls onAcceptTokensTransfer back to Market
          await marketOwner.runTarget({
            contract: marketOwnerWallet,
            method: 'transfer',
            params: {
              amount: 9,
              recipient: market.address,
              remainingGasTo: marketOwner.address,
              notify: true,
              deployWalletValue: 0,
              payload,
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let after = await getPurchaseCount(market)

          expect(after.toNumber()).to.be.equal(before.toNumber())
        })
        it('should sell nft if in order', async function () {
          this.timeout(20000)

          const curr_p = (await getPurchaseCount(market)).toNumber();
          const curr_t = (await getTotalSupply(market)).toNumber();

          // Check if There Is Free NFT
          if (curr_p == curr_t) {
            // Mint NFT
            const res1 = await marketOwner.runTarget({
              contract: market,
              method: 'mintNft',
              params: { json: `{"id":"${curr_p}"}` },
              keyPair: marketOwner.keyPair,
              value: locklift.utils.convertCrystal(2, 'nano')
            })
          }
          let target_nft = await getNftById(market, curr_p);
          let before_info = await target_nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })
          expect(before_info.owner).to.equal(market.address)

          // Set NFT Owner
          let newOwner = marketOwner.address;

          let payload = await market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: newOwner,
            }
          })

          // Run Purchase
          // This calls onAcceptTokensTransfer back to Market
          await marketOwner.runTarget({
            contract: marketOwnerWallet,
            method: 'transfer',
            params: {
              amount: 10,
              recipient: market.address,
              remainingGasTo: marketOwner.address,
              notify: true,
              deployWalletValue: 0,
              payload,
            },
            keyPair: marketOwner.keyPair,
            value: locklift.utils.convertCrystal(4, 'nano')
          })

          let resInfo = await target_nft.call({
            method: 'getInfo',
            params: { answerId: 0 }
          })

          expect(resInfo.owner).to.equal(marketOwner.address)
          expect(resInfo.manager).to.equal(marketOwner.address)
        })

        it('should not sell nft if not in order', async function () {
          this.timeout(80000)

          const keyPairs = await locklift.keys.getKeyPairs();
          const user1 = keyPairs[0];

          // MINT NFT
          let ex_json = "{name:'Jerry'}";
          const res = await marketOwner.runTarget({
            contract: market,
            method: 'mintNft',
            params: { owner: marketOwner.address, json: ex_json },
            keyPair: user1,
            value: locklift.utils.convertCrystal(2, 'nano')
          })

          let curr_supply = await getTotalSupply(market)

          // Set NFT Owner
          let payload = await market.call({
            method: '_serializeNftPurchase',
            params: {
              recipient: marketOwner.address,
            }
          })

          // Run Purchase Higher Than Count
          // This calls onAcceptTokensTransfer back to Market
          for (let index = 0; index < curr_supply + 1; index++) {
            await marketOwner.runTarget({
              contract: marketOwnerWallet,
              method: 'transfer',
              params: {
                amount: 10,
                recipient: market.address,
                remainingGasTo: marketOwner.address,
                notify: true,
                deployWalletValue: 0,
                payload
              },
              keyPair: marketOwner.keyPair,
              value: locklift.utils.convertCrystal(10, 'nano')
            })
          }

          let curr_count_after = await getPurchaseCount(market)

          expect(curr_count_after.toNumber()).to.be.equal(curr_supply.toNumber())
        })
      })
    })
  })
})