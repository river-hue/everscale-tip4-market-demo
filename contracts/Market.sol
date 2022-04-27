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

    function tokenRoot() external view virtual responsible returns (address root) {
        return {value: 0, flag: 64, bounce: true} (_tokenRoot);
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

    function setMinNftTokenPrice(uint256 amount) public onlyOwner {
        tvm.accept();
        _minNftTokenPrice = amount;
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
            address nftAddr = _nftAddress(_purchaseCount);
            _purchaseCount++;

            // Set Simple Callback for TIP4_1#changeOwner
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[newOwner] = ITIP4_1NFT.CallbackParams(0.1 ton,empty);

            Nft(nftAddr).changeOwner{
                value: 0 ton,
                flag: 64,
                bounce: true
            }(newOwner, remainingGasTo, callbacks);
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

    // Transfers Tokens to Owner
    function transfer(uint128 amount) external onlyOwner {
        address _owner = owner();
        TvmCell empty;
        ITokenWallet(_tokenWallet).transfer{value: 0 , flag: 64, bounce: true}(amount, _owner, 0.2 ton, _owner, false, empty);
    }

    // Transfer Ever to Owner
    function transferEver(uint128 value) external onlyOwner {
        address _owner = owner();
        TvmCell empty;
        ExtraCurrencyCollection c;
        _owner.transfer({value: value, bounce: true, flag: 64, body: empty, currencies: c});
    }

    // Transfer NFT to Reciever
    function transferNft(address newOwner, address remainingGasTo) external onlyOwner {

        // Check if Tickets are not Oversold
        if (_purchaseCount < _totalSupply) {
            address nftAddr = _nftAddress(_purchaseCount);
            _purchaseCount++;

            // Set Simple Callback for TIP4_1#changeOwner
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[newOwner] = ITIP4_1NFT.CallbackParams(0.1 ton,empty);

            Nft(nftAddr).changeOwner{
                value: 0 ton,
                flag: 64,
                bounce: true
            }(newOwner, remainingGasTo, callbacks);
        }
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
