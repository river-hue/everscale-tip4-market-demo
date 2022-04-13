pragma ton-solidity = 0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import './modules/TokenContracts/interfaces/IAcceptTokensTransferCallback.sol';
import './modules/TokenContracts/libraries/TokenErrors.sol';
import './modules/TIP4_1/interfaces/ITIP4_1Collection.sol';
import './modules/TokenContracts/TokenRoot.sol';
import './modules/TIP4_3/TIP4_3Collection.sol';
import './modules/TIP4_1/TIP4_1Collection.sol';


import './Nft.sol';
import "./Collection.sol";

contract Market is Collection, IAcceptTokensTransferCallback {

    address _tokenWallet;
    address _tokenRoot;
    uint256 _minNftTokenPrice;
    uint256 _purchaseCount;
    address _testOwner;

    constructor(
        address tokenRoot,
        uint256 minNftTokenPrice,
        TvmCell codeNft,
        TvmCell codeIndex,
        TvmCell codeIndexBasis,
        uint256 ownerPubkey,
        address testOwner
    ) Collection(
        codeNft, 
        codeIndex,
        codeIndexBasis,
        ownerPubkey
    ) public {
       tvm.accept();
       _tokenRoot = tokenRoot;
       _minNftTokenPrice = minNftTokenPrice;
       _testOwner = testOwner;
       
       TokenRoot(tokenRoot).deployWallet{
           value: 0.5 ton,
           flag: 1,
           callback: setTokenWallet,
           bounce: true
        }(address(this), 0.1 ton);
    }

    function mintNft(address owner, string json) public virtual {
        require(msg.sender == _testOwner, 100);
        _mintNft(owner, json);
    }

    function purchaseCount() external view virtual responsible returns (uint count) {
        return {value: 0, flag: 64, bounce: false} (_purchaseCount);
    }

    function tokenWallet() external view virtual responsible returns (address wallet) {
        return {value: 0, flag: 64, bounce: false} (_tokenWallet);
    }

    function setTokenWallet(address newTokenWallet) public {
        require(msg.sender == _tokenRoot, TokenErrors.WRONG_ROOT_OWNER);
        tvm.accept();
        _tokenWallet = newTokenWallet;
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

        // Check Payload
        (address newOwner, string json) = _deserializeNftPurchase(payload);
        
        // Check if Tickets are not Oversold
        // Check if Price is Correct
        if(_purchaseCount < _totalSupply && amount >= _minNftTokenPrice) {
            _purchaseCount++;
            address nftAddr = _nftAddress(_purchaseCount);
            mapping(address => ITIP4_1NFT.CallbackParams) empty;
            Nft(nftAddr).changeOwner{
                value: 0 ton,
                flag: 1,
                bounce: true
            }(newOwner, remainingGasTo, empty);
        } else {
            // Else Return Tokens Back to Sender
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 128, bounce: false}(
                amount,
                sender,
                0,
                remainingGasTo,
                true,
                payload
            );
        }
    }

    function _deserializeNftPurchase(TvmCell payload) internal returns (address reciever, string json) {
        return abi.decode(payload, (address, string));
    }

    function _serializeNftPurchase(address recipient, string json) public pure returns (TvmCell payload) {
        TvmBuilder encoder;
        encoder.store(recipient);
        encoder.store(json);
        return encoder.toCell();
    }

}
