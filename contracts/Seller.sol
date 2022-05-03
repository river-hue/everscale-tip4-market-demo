pragma ton-solidity =0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "./modules/TIP4_3/TIP4_3Collection.sol";
import './modules/TokenContracts/interfaces/IAcceptTokensTransferCallback.sol';

contract Seller is OwnableInternal, IAcceptTokensTransferCallback {
   
    /** Errors */
    uint256 constant seller_is_not_open;
    
    /** Unique Seller Per Nft */
	address static _collection;
	address static _nft;

	/** Royalties */
    uint8 constant ROYALTY_DECIMALS = 2;
	uint8 public immutable _royaltyFee;
	address public immutable _author;

    /** Sales can be done in Different Tokens and SalePrices */
	address public _tokenRoot;
    address public _tokenWallet;
	uint256 public _salePrice;

    bool public _isOpen = false;

    constructor(
        address author,
        address nft,
		address royaltyTo,
		uint256 royaltyFee,
	) public {
		tvm.accept();
        _author = author;
        require(_royaltyFee < 100*(10**ROYALTY_DECIMALS));
	}

    /** Opens or Updates Sale after Deadline */
    function open(address tokenRoot, uint256 price, uint256 deadline) public {
        
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
        require(_isOpen, 1001);

        // Check Payload, if zero, accept transfer with no purchase
        (address newOwner) = _deserializeNftPurchase(payload);
        if (newOwner == address(0)) return;

        // Check if Tickets are not Oversold
        // Check if Price is Correct
        if(amount >= _salePrice) {
            address nftAddr = _nftAddress(_purchaseCount);

            // Set Simple Callback for TIP4_1#changeOwner
            mapping(address => ITIP4_1NFT.CallbackParams) callbacks;
            TvmCell empty;
            callbacks[newOwner] = ITIP4_1NFT.CallbackParams(0.1 ton,empty);
            
            Nft(nftAddr).transfer{
                value: 0 ton,
                flag: 64,
                bounce: true
            }(newOwner, remainingGasTo, callbacks);
            
            // On Success, send royalties to author and the rest to the owner
            // TODO: Prove royalty = amount
            // TODO: Seperate this into a hook
            uint256 royalty = (amount * _royaltyFee)/(100 * (10**ROYALTY_DECIMALS));
            uint256 sale = amount - royalty;

            // Send Tokens to Author
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 64, bounce: false}(
                royalty,
                author,
                0,
                remainingGasTo,
                true,
                payload
            );

            // Send Tokens to Owner
            ITokenWallet(msg.sender).transfer{value: 0 , flag: 64, bounce: false}(
                sale,
                owner,
                0,
                remainingGasTo,
                true,
                payload
            );

        }

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

    function _deserializeNftPurchase(TvmCell payload) internal returns (address reciever) {
        return abi.decode(payload, (address));
    }

}
