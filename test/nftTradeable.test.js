// @ts-check

const { expect } = require("chai");
const { locklift, CollectionTradeable: Collection, NftTradeable: Nft, TokenRoot, TokenWallet, Contract, Account, deployAccount, logContract, getRandomNonce, TIP4, } = require("./utils");

describe('Test NftTradeable contract', async function () {
    /** @type {Contract} */
    let collection;
    /** @type {Contract} */
    let tokenRoot;
    /** @type {Contract} */
    let collectionOwnerWallet;
    /** @type {Account} */
    let collectionOwner;

    describe('Contracts', async function () {
        it('Should Load contract factory', async function () {
            let Collection = await locklift.factory.getContract("CollectionTradeable");

            expect(Collection.code).not.to.equal(undefined, 'Code should be available');
            expect(Collection.abi).not.to.equal(undefined, 'ABI should be available');
        })

        it('Should Deploy NftTradeable Contract', async function () {
            this.timeout(800000);

            const keyPairs = await locklift.keys.getKeyPairs();
            const user1 = keyPairs[0];

            collectionOwner = await deployAccount(user1, 100)
            tokenRoot = await TokenRoot.deploy(collectionOwner, { name: 'Test Token', symbol: 'TST', decimals: '4' })
            collection = await Collection.deploy(collectionOwner, { remainOnNft: 0.3 })
            let [nft,] = await Collection.mintNft(collectionOwner, collection, [TIP4.DEFAULT], 0, tokenRoot.address)
            return expect(nft.address).to.be.a('string')
                .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
        })

        it('Should Deploy Wallet Contract', async function () {
            this.timeout(800000);
            collectionOwnerWallet = await TokenWallet.deploy(collectionOwner, tokenRoot);
            expect(collectionOwnerWallet.address).to.be.a('string')
                .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
        })
    })
    describe('openSale()', function () {
        it('Should open sale if owner')
        it('Should open sale if collection')
        it('Should transfer ownership to buyer iff correct amount and send tokens to seller')
        it('Should not transfer ownership to buyer if incorrect amount and send tokens back to buyer')
        it('Should not transfer ownership to buyer if incorrect token and send tokens back to buyer')
    })
    describe('closeSale()', function () {
        it('Should close sale if owner')
        it('Should close sale if sale complete')
        it('Should not transfer ownership to buyer if closed and send tokens back to buyer')
    })


})