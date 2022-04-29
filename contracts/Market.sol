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
import './modules/RandomNonce.sol';

import './Nft.sol';
import "./Collection.sol";

contract Market is Collection, RandomNonce, IAcceptTokensTransferCallback {

    /**
    * Errors
    **/
    uint8 constant value_is_less_than_required = 104;

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
        address owner,
        uint128 remainOnNft
    ) Collection(
        codeNft,
        codeIndex,
        codeIndexBasis,
        owner,
        remainOnNft
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

    function mintNft(string json) public virtual onlyOwner {
        require(
			msg.value > _remainOnNft + 0.1 ton,
			value_is_less_than_required
		);
		tvm.rawReserve(0, 4);
        _mintNft(this, json, 0, 128);
    }

    function batchMintNft(string[] jsons) public virtual onlyOwner {
        require(
			msg.value > _remainOnNft + (3 ton * jsons.length),
			value_is_less_than_required
		);
		tvm.rawReserve(0, 4);

        for ((string json) : jsons) {
            _mintNft(this, json, 3 ton, 0);
        }
    }

    function setTokenRoot(address newTokenRoot) public onlyOwner {
        _setTokenRoot(newTokenRoot);
    }

    function _setTokenRoot(address newTokenRoot) internal {
        _tokenRoot = newTokenRoot;
       TokenRoot(_tokenRoot).deployWallet{
           value: 0.5 ton,
           flag: 1,
           callback: setTokenWallet,
           bounce: true
        }(address(this), 0.1 ton);
    }

    function setTokenWallet(address newTokenWallet) public {
        require(msg.sender == _tokenRoot, TokenErrors.WRONG_ROOT_OWNER);
        tvm.accept();
        _tokenWallet = newTokenWallet;
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

            Nft(nftAddr).transfer{
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
        ITokenWallet(_tokenWallet).transfer{value: 0, flag: 64, bounce: true}(amount, _owner, 0.2 ton, _owner, false, empty);
    }

    // Transfer Ever to Owner
    function transferEver(uint128 value, uint16 flag, bool bounce) public onlyOwner {
        address _owner = owner();
        TvmCell empty;
        _owner.transfer(value,bounce,flag,empty);
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

            Nft(nftAddr).transfer{
                value: 0 ton,
                flag: 64,
                bounce: true
            }(newOwner, remainingGasTo, callbacks);
        }
    }

    function batchTransferNft(address newOwner, address remainingGasTo, uint256 amount) external onlyOwner {
        if (amount > 0 && _purchaseCount + amount - 1 < _totalSupply) {
            // Set Simple Callback for TIP4_1#changeOwner
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[newOwner] = ITIP4_1NFT.CallbackParams(0.1 ton,empty);

            for (uint256 i = 0; i < amount; i++) {
                address nftAddr = _nftAddress(_purchaseCount+i);

                Nft(nftAddr).transfer{
                    value: 3 ton,
                    bounce: true
                }(newOwner, remainingGasTo, callbacks);
            }
            _purchaseCount += amount;
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
