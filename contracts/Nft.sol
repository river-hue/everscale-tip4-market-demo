// ItGold.io Contracts (v1.0.0) 

pragma ton-solidity = 0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;


import './modules/TIP4_1/TIP4_1Nft.sol';
import './modules/TIP4_3/TIP4_3Nft.sol';

contract Nft is TIP4_1Nft, TIP4_3Nft {

    constructor(
        address owner,
        address sendGasTo,
        uint128 remainOnNft,
        uint128 indexDeployValue,
        uint128 indexDestroyValue,
        TvmCell codeIndex
    ) TIP4_1Nft(
        owner,
        sendGasTo,
        remainOnNft
    ) TIP4_3Nft (
        indexDeployValue,
        indexDestroyValue,
        codeIndex
    ) public {
        tvm.accept();
    }

    function changeOwner(
        address newOwner, 
        address sendGasTo, 
        mapping(address => CallbackParams) callbacks
    ) public virtual override(TIP4_1Nft, TIP4_3Nft) onlyManager {
        TIP4_3Nft.changeOwner(newOwner, sendGasTo, callbacks);
    }


}