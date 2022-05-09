// @ts-check

const { expect } = require("chai");
const { locklift, CollectionTradeable: Collection, NftTradeable: Nft, TokenRoot, TokenWallet, Contract, Account, deployAccount, logContract, getRandomNonce, TIP4, } = require("./utils");

describe('Test CollectionTradeable contract', async function () {
    /** @type {Contract} */
    let collection;
    /** @type {Contract} */
    let tokenRoot;
    /** @type {Contract} */
    let collectionOwnerWallet;
    /** @type {Account} */
    let collectionOwner;

    let TEST_NFT_PRICE = 10000

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
            tokenRoot = await TokenRoot.deploy(collectionOwner, { name: 'Test Token', symbol: 'TST', decimals: '4' })
            collection = await Collection.deploy(collectionOwner, { remainOnNft: 0.3 })

            return expect(collection.address).to.be.a('string')
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
        it('should open sales on all existing nft iff owner', async function () {

            this.timeout(20000);

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let start = await Collection.getTotalSupply(collection)
            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)
            await Collection.openSale(collectionOwner, collection, { salePrice: TEST_NFT_PRICE })
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start.toNumber() + i)
                let isOpen = await Nft.getIsOpen(nft)
                expect(isOpen).to.be.true
            }

        })
        it('should not open sales on any sale if not owner', async function () {

            this.timeout(20000);
            const keyPairs = await locklift.keys.getKeyPairs();
            let attacker = await deployAccount(keyPairs[4], 100)

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let start = await Collection.getTotalSupply(collection)
            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)
            await Collection.openSale(attacker, collection, { salePrice: TEST_NFT_PRICE })
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start.toNumber() + i)
                let isOpen = await Nft.getIsOpen(nft)
                expect(isOpen).to.be.false
            }

        })

    })
    describe('closeSale()', function () {
        it('should close all open sales on all existing nft iff owner', async function () {

            this.timeout(20000);

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let start = await Collection.getTotalSupply(collection)
            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)
            await Collection.openSale(collectionOwner, collection, { salePrice: TEST_NFT_PRICE })
            await Collection.closeSale(collectionOwner, collection)
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start.toNumber() + i)
                let isOpen = await Nft.getIsOpen(nft)
                expect(isOpen).to.be.false
            }

        })
        it('should not close any open sales on any existing nft if not owner', async function () {
            this.timeout(20000);
            const keyPairs = await locklift.keys.getKeyPairs();
            let attacker = await deployAccount(keyPairs[4], 100)

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let start = await Collection.getTotalSupply(collection)
            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)
            await Collection.openSale(collectionOwner, collection, { salePrice: TEST_NFT_PRICE })
            await Collection.closeSale(attacker, collection)
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start.toNumber() + i)
                let isOpen = await Nft.getIsOpen(nft)
                expect(isOpen).to.be.true
            }

        })
    })
    describe('mintNft()', function () {
        it('Should mint new Nft iff owner', async function () {
            this.timeout(20000);

            const keyPairs = await locklift.keys.getKeyPairs();

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let before = await Collection.getTotalSupply(collection)

            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)

            let after = await Collection.getTotalSupply(collection)
            expect(after.toNumber()).to.equal(before.toNumber() + 4)

            let start = before.toNumber()
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start + i)
                const res_json = await Nft.getJson(nft)
                const res_info = await Nft.getInfo(nft)

                expect(res_json).to.deep.equal(ex_json)
                expect(res_info.owner).to.equal(collectionOwner.address)
            }
        })
        it('Should not mint new Nft iff not owner', async function () {
            this.timeout(20000);

            const keyPairs = await locklift.keys.getKeyPairs();

            let ex_json = { id: getRandomNonce(), ...TIP4.DEFAULT };
            let before = await Collection.getTotalSupply(collection)

            await Collection.mintNft(collectionOwner, collection, Array(4).fill(ex_json), 0, tokenRoot.address)

            let after = await Collection.getTotalSupply(collection)
            expect(after.toNumber()).to.equal(before.toNumber() + 4)

            let start = before.toNumber()
            for (let i = 0; i < 4; i++) {
                let nft = await Collection.getNftById(collection, start + i)
                const res_json = await Nft.getJson(nft)
                const res_info = await Nft.getInfo(nft)

                expect(res_json).to.deep.equal(ex_json)
                expect(res_info.owner).to.equal(collectionOwner.address)
            }
        })
    })
})