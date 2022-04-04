pragma ton-solidity = 0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import './modules/TIP4_3/TIP4_3Collection.sol';
import './modules/access/OwnableExternal.sol';
import './Nft.sol';
import "./Collection.sol";

contract Market is OwnableExternal {

    address collectionAddr;
    address ownerPubkey;

    constructor(
        TvmCell codeNft, 
        TvmCell codeIndex,
        TvmCell codeIndexBasis,
        uint256 ownerPubkey
        ) OwnableExternal(
            ownerPubkey
        ) public {
       tvm.accept();

       TvmCell codeCollection = tvm.buildStateInit(this, )
       address collectionAddr = new Collection{ stateInit: }(
            codeNft,
            codeIndex,
            codeIndexBasis,
            ownerPubkey
       );
    }





}
