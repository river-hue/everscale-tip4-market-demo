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

    constructor(
        address tokenRoot,
        uint256 minNftTokenPrice,
        TvmCell codeNft,
        TvmCell codeIndex,
        TvmCell codeIndexBasis,
        address ownerPubkey
    ) Collection(
        codeNft, 
        codeIndex,
        codeIndexBasis,
        ownerPubkey
    ) public {
       tvm.accept();
       _minNftTokenPrice = minNftTokenPrice;
       _setTokenRoot(tokenRoot);
    }

    function minNftTokenPrice() external view virtual responsible returns (uint256 amount) {
        return {value: 0, flag: 64, bounce: true} (_minNftTokenPrice);
    }

    function purchaseCount() external view virtual responsible returns (uint count) {
        return {value: 0, flag: 64, bounce: true} (_purchaseCount);
    }

    function tokenWallet() external view virtual responsible returns (address wallet) {
        return {value: 0, flag: 64, bounce: true} (_tokenWallet);
    }

    function mintNft(address owner, string json) public virtual onlyOwner {
        _mintNft(owner, json);
    }

    function setTokenWallet(address newTokenWallet) public {
        require(msg.sender == _tokenRoot, TokenErrors.WRONG_ROOT_OWNER);
        tvm.accept();
        _tokenWallet = newTokenWallet;
    }

    function setTokenRoot(address tokenRoot) public onlyOwner {
        _setTokenRoot(tokenRoot);
    }

    function _setTokenRoot(address tokenRoot) internal {
        _tokenRoot = tokenRoot;
       TokenRoot(tokenRoot).deployWallet{
           value: 0.5 ton,
           flag: 1,
           callback: setTokenWallet,
           bounce: true
        }(address(this), 0.1 ton);
    }

    function setMinNftTokenPrice(uint256 minNftTokenPrice) public onlyOwner {
        tvm.accept();
        _minNftTokenPrice= minNftTokenPrice;
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

        // Check Payload, if zero, accept transfer with no purchase
        (address newOwner) = _deserializeNftPurchase(payload);
        if (newOwner == address(0)) return;

        // Check if Tickets are not Oversold
        // Check if Price is Correct
        if(_purchaseCount < _totalSupply && amount >= _minNftTokenPrice) {
            _purchaseCount++;
            address nftAddr = _nftAddress(_purchaseCount);
            mapping(address => ITIP4_1NFT.CallbackParams) empty;
            Nft(nftAddr).changeOwner{
                value: 0 ton,
                flag: 64,
                bounce: true
            }(newOwner, remainingGasTo, empty);
        } else {
            // Else Return Tokens Back to Sender
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 64, bounce: false}(
                amount,
                sender,
                0,
                remainingGasTo,
                true,
                payload
            );
        }
    }

    // TokenWallet
    function _transfer(
        uint128 amount,
        address recipient,
        uint128 deployWalletValue,
        address remainingGasTo,
        bool notify,
        TvmCell payload
    )
        external
        onlyOwner
    {
        ITokenWallet(_tokenWallet).transfer{value: 0 , flag: 64, bounce: true}(amount, recipient, deployWalletValue, remainingGasTo, notify, payload);
    }

    function _deserializeNftPurchase(TvmCell payload) internal returns (address reciever) {
        return abi.decode(payload, (address));
    }

    function _serializeNftPurchase(address recipient) public pure returns (TvmCell payload) {
        TvmBuilder encoder;
        encoder.store(recipient);
        return encoder.toCell();
    }

}
