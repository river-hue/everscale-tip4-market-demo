// ItGold.io Contracts (v1.0.0) 

pragma ton-solidity = 0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import './modules/TokenContracts/interfaces/IAcceptTokensTransferCallback.sol';
import './modules/TokenContracts/libraries/TokenErrors.sol';
import './modules/TokenContracts/TokenRoot.sol';

import './modules/TIP4_1/TIP4_1Nft.sol';
import './modules/TIP4_3/TIP4_3Nft.sol';
import './modules/TIP4_2/TIP4_2Nft.sol';

contract NftTradeable is IAcceptTokensTransferCallback, TIP4_1Nft, TIP4_2Nft, TIP4_3Nft {

    /** Errors */
    uint256 constant sender_is_not_author = 400;
    uint256 constant sender_is_not_collection_or_manager = 401;
    uint256 constant sale_is_not_open = 501;

	/** Royalties */
    uint8 public constant ROYALTY_FEE_DECIMALS = 2;
	uint8 public _royaltyFee = 0;

    /** Sales can be done in Different Tokens and SalePrices */
	address public _tokenRoot;
    address public _tokenWallet;
	uint256 public _salePrice;
    bool public _isOpen = false;

    /** ROLES */
    /* Author: Is Sent all Royalties, has Initial Control Over RoyaltyFee Before Sale */
	address public  _author;

    constructor(
        uint8 royaltyFee,
        address tokenRoot,
        address owner,
        address sendGasTo,
        uint128 remainOnNft,
        string json,
        uint128 indexDeployValue,
        uint128 indexDestroyValue,
        TvmCell codeIndex
    ) TIP4_1Nft(
        owner,
        sendGasTo,
        remainOnNft
    ) TIP4_2Nft (
        json
    ) TIP4_3Nft (
        indexDeployValue,
        indexDestroyValue,
        codeIndex
    ) public {
        tvm.accept();
        _author = owner;
        _royaltyFee = royaltyFee;
        _setTokenRoot(tokenRoot);
    }

    modifier onlyManagerOrMaybeCollection {
        bool isAuthor = _manager == _author;
        require(msg.sender == _manager || (isAuthor && msg.sender == _collection), sender_is_not_collection_or_manager);
        _;
    }
    /** Opens Sale */
    /** Collection Can Only Call This if Owned By Author */
    function openSale(uint256 salePrice) external onlyManagerOrMaybeCollection {
        _isOpen = true;
        _salePrice = salePrice;
    }

    /** Closes Sale */
    /** Collection Can only Call this if Owned By Author */
    function closeSale() external onlyManagerOrMaybeCollection {
        _isOpen = false;
        _salePrice = 0;
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
        _runPurchase(sender, amount, remainingGasTo, payload);
    }

    function _runPurchase(
        address sender,
        uint128 amount,
        address remainingGasTo,
        TvmCell payload
    ) internal {
        // Check if On Sale
        // Check if Price is Correct
        if(_isOpen && amount >= _salePrice) {
            // On Success, send royalties to author and the rest to the owner
            (uint128 toAuthor, uint128 toSeller) = _calcRoyalties(amount);

            // Send Tokens to Author
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 64, bounce: false}(
                toAuthor,
                _author,
                0,
                remainingGasTo,
                true,
                payload
            );

            // Send Tokens to Owner
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 64, bounce: false}(
                toSeller,
                _owner,
                0,
                remainingGasTo,
                true,
                payload
            );

            // Set Simple Callback for TIP4_1#transfer
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[sender] = ITIP4_1NFT.CallbackParams(0.1 ton,empty);
        
            // Completes Sale
            transfer(sender, remainingGasTo, callbacks);
            _isOpen = false;

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

    // TODO: Prove royalty = amount
    // TODO: Prove overflows are handled
    // TODO: Seperate this into a hook
    function _calcRoyalties(uint128 amount) view public returns (uint128 toAuthor, uint128 toSeller) {
        toAuthor = (amount * _royaltyFee)/(100 * (10**ROYALTY_FEE_DECIMALS));
        toSeller = amount - toAuthor;
        return (toAuthor, toSeller);
    }

    function _setRoyaltyFee(uint8 royaltyFee) public onlyManager {
        require(msg.sender == _author, sender_is_not_author);
        _royaltyFee = royaltyFee;
    }

    function _setTokenRoot(address newTokenRoot) internal {
        _tokenRoot = newTokenRoot;
       TokenRoot(_tokenRoot).deployWallet{
           value: 0.5 ton,
           flag: 1,
           callback: _setTokenWallet,
           bounce: true
        }(address(this), 0.1 ton);
    }

    function _setTokenWallet(address newTokenWallet) public {
        require(msg.sender == _tokenRoot, TokenErrors.WRONG_ROOT_OWNER);
        tvm.accept();
        _tokenWallet = newTokenWallet;
    }

    function _beforeTransfer(
        address to, 
        address sendGasTo, 
        mapping(address => TIP4_1Nft.CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._destructIndex(sendGasTo);
    }

    function _afterTransfer(
        address to, 
        address sendGasTo, 
        mapping(address => TIP4_1Nft.CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._deployIndex();
    }

    function _beforeChangeOwner(
        address oldOwner, 
        address newOwner,
        address sendGasTo, 
        mapping(address => TIP4_1Nft.CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._destructIndex(sendGasTo);
    }   

    function _afterChangeOwner(
        address oldOwner, 
        address newOwner,
        address sendGasTo, 
        mapping(address => TIP4_1Nft.CallbackParams) callbacks
    ) internal virtual override(TIP4_1Nft, TIP4_3Nft) {
        TIP4_3Nft._deployIndex();
    }
}