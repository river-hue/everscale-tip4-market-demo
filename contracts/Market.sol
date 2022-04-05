pragma ton-solidity = 0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import './modules/TokenContracts/interfaces/IAcceptTokensTransferCallback.sol';
import './modules/TokenContracts/libraries/TokenErrors.sol';
import './modules/TokenContracts/TokenRoot.sol';
import './modules/TIP4_3/TIP4_3Collection.sol';

import './Nft.sol';
import "./Collection.sol";

contract Market is Collection, IAcceptTokensTransferCallback {

    address _tokenWallet;
    uint56 _minNftTokenPrice;

    constructor(
        address tokenRoot,
        uint256 minNftTokenPrice,
        TvmCell codeNft,
        TvmCell codeIndex,
        TvmCell codeIndexBasis,
        uint256 ownerPubkey
    ) Collection(
        codeNft, 
        codeIndex,
        codeIndexBasis,
        ownerPubkey
    ) public {
       tvm.accept();
       _tokenWallet = TokenRoot(tokenRoot).walletOf(this);
    }

    function onAcceptTokensTransfer(
        address tokenRoot,
        uint128 amount,
        address sender,
        address senderWallet,
        address remainingGasTo,
        TvmCell payload
    ) override external {
        require(msg.sender == _tokenWallet, TokenErrors.WRONG_WALLET_OWNER);

        // Send Back Gas
        // TODO

        // Check Payload
        (uint256 nftId, address newOwner) = _deserializeNftPurchase(payload);
        require(nftId <= _totalSupply, TokenErrors.NOT_OWNER);
        // Get Nft
        Nft targetNft = Nft(this.nftAddress(nftId));
        // Check if still for Sale
        (, address prevOwner,,) = targetNft.getInfo();
        require(prevOwner == this, TokenErrors.NOT_OWNER);

        // If for Sale Check That Purchase is Correct
        require(amount >= _minNftTokenPrice, TokenErrors.NOT_ENOUGH_BALANCE);
        // TODO: Figure out SendGasTo
        targetNft.changeOwner(newOwner, remainingGasTo, null);
        
    }

    function _deserializeNftPurchase(TvmCell payload) internal returns (uint256 nftId, address reciever) {
        return abi.decode(payload, (uint256, address));
    }

}
