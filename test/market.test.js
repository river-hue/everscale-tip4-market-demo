const { expect } = require("chai");

let Sample;
let sample;

const getRandomNonce = () => Math.random() * 64000 | 0;

async function deployMarket() {
  const Market = await locklift.factory.getContract("Market")
  const Nft = await locklift.factory.getContract("NFT");
  const Index = await locklift.factory.getContract("Index")
  const IndexBasis = await locklift.factory.getContract("IndexBasis")

  const [keyPair] = await locklift.keys.getKeyPairs();
  const ownerPubkey = "0x" + keyPair.public;

  return await locklift.giver.deployContract({
    contract: Market,
    constructorParams: {
      codeNft: Nft.code,
      codeIndex: Index.code,
      codeIndexBasis: IndexBasis.code,
      ownerPubkey: ownerPubkey
    },
    initParams: {},
    keyPair,
  }, locklift.utils.convertCrystal(1, 'nano'))
}

describe('Test Market contract', async function () {

  let market;

  describe('Contracts', async function () {
    it('Should Load contract factory', async function () {
      let Market = await locklift.factory.getContract("Market");

      expect(Market.code).not.to.equal(undefined, 'Code should be available');
      expect(Market.abi).not.to.equal(undefined, 'ABI should be available');
    })

    it('Should Deploy contract', async function () {
      this.timeout(20000);

      market = await deployMarket()

      expect(market.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    })
  })

  describe('Collection', async function () {
    describe('.deployIndexBasis()', function () {
      it('Should run', async function () {
        this.timeout(20000)

        const [keyPair] = await locklift.keys.getKeyPairs();

        await market.run({
          method: 'deployIndexBasis',
          params: {},
          initParams: {},
          keyPair
        }, locklift.utils.convertCrystal(10000, 'nano'))

      })
    })
    describe('.mintNft()', async function () {
      it('Should run', async function () {
        this.timeout(20000);

        const [keyPair] = await locklift.keys.getKeyPairs();

        const res = await market.run({
          method: 'mintNft',
          params: {},
          keyPair,
        }, locklift.utils.convertCrystal(1000, 'nano'))

        console.log(res)
      })

    })
  })
})

describe.skip('Test Sample contract', async function () {
  describe('Contracts', async function () {
    it('Load contract factory', async function () {
      Sample = await locklift.factory.getContract('Sample');

      expect(Sample.code).not.to.equal(undefined, 'Code should be available');
      expect(Sample.abi).not.to.equal(undefined, 'ABI should be available');
    });

    it('Deploy contract', async function () {
      this.timeout(20000);

      const [keyPair] = await locklift.keys.getKeyPairs();

      sample = await locklift.giver.deployContract({
        contract: Sample,
        constructorParams: {
          _state: 123
        },
        initParams: {
          _nonce: getRandomNonce(),
        },
        keyPair,
      });

      expect(sample.address).to.be.a('string')
        .and.satisfy(s => s.startsWith('0:'), 'Bad future address');
    });

    it('Interact with contract', async function () {
      await sample.run({
        method: 'setState',
        params: { _state: 111, _random: "" },
      });

      const response = await sample.call({
        method: 'getDetails',
        params: {},
      });

      expect(response.toNumber()).to.be.equal(111, 'Wrong state');
    });
  });
});
