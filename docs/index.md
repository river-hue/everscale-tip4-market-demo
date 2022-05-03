## Notes:

### Reference:

* OpenSea `ERC721Tradeable`: https://github.com/ProjectOpenSea/opensea-creatures
* WyvernProtocol: https://wyvernprotocol.com/docs/protocol-components


### User Stories:

#### Seller(Alice):
1. Alice Deploys a `Collection`
2. Alice Mints `Nft`
3. Alice Creates a `Seller` from `Collection`:
    1. Sets Price in Tokens
    2. Sets Deadline
    3. Sets Royalty Address
    4. Gives Control to `Seller`

#### Buyer(Bob)
4. Bob finds `Collection` from `MarketApi`
5. Bob finds `Seller` of `Nft` through `Collection`
6. Bob reads price from `Seller`
7. Bob sends tokens to `Seller`
8. `Seller` sends tokens to Alice
9. `Seller` transfers ownership to Bob
10. `Seller` closes

#### ReSeller(Bob)
11. Bob decides to Trade
12. Bob finds `Seller` of `Nft` through `Collection`
12. Bob sets new price in `Seller`:
    1. Sets Price in Tokens
    2. Sets Deadline
13. `Seller` opens

#### Trader(Joe)
14. Joe finds `Collection` from `MarketApi`
15. Joe reads price from `Seller`
16. Joe sends tokens to `Seller`
17. `Seller` sends royalties to Alice
18. `Seller` sends the rest of tokens to Bob
18. `Seller` transfers ownership to Joe


