// @ts-check

const { expect } = require("chai");
const { locklift, Contract, Account, deployAccount, deployTokenRoot, deployTokenWallet, logContract,  getRandomNonce, deployCollectionTradeable } = require("./utils");

describe('Test CollectionTradeable contract', async function () {
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

        it('Should Deploy CollectionTradeable Contract', async function () {
            this.timeout(800000);

            const keyPairs = await locklift.keys.getKeyPairs();
            const user1 = keyPairs[0];

            collectionOwner = await deployAccount(user1, 100)
            tokenRoot = await deployTokenRoot(collectionOwner, { name: 'Test Token', symbol: 'TST', decimals: '4' })
            collection = await deployCollectionTradeable(collectionOwner, tokenRoot, { remainOnNft: 0.3, defaultRoyaltyFee: 100 })

            return expect(collection.address).to.be.a('string')
                .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
        })

        it('Should Deploy Wallet Contract', async function () {
            this.timeout(800000);
            collectionOwnerWallet = await deployTokenWallet(collectionOwner, tokenRoot);
            expect(collectionOwnerWallet.address).to.be.a('string')
                .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
        })
    })
    describe('openSale()', function() {})
    describe('closeSale()', function() {})
    describe('mintNft()', function() {})
    describe('setRemainOnNft()', function() {})
    describe('setDefaultRoyaltyFee()', function() {})
})