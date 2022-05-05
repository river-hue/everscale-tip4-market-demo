pragma ton-solidity =0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "./modules/TIP4_3/TIP4_3Collection.sol";
import "./modules/access/OwnableInternal.sol";
import "./NftTradeable.sol";
import './modules/RandomNonce.sol';


contract CollectionTradeable is TIP4_3Collection, OwnableInternal, RandomNonce {
	 /** Errors **/
    uint8 constant value_is_less_than_required = 104;
	
	/// _remainOnNft - the number of crystals that will remain after the entire mint
	/// process is completed on the Nft contract
	uint128 _remainOnNft;

	/// The default royalty fee for all Nfts
	uint8 _defaultRoyaltyFee;
	address _defaultTokenRoot;

	constructor(
		TvmCell codeNft,
		TvmCell codeIndex,
		TvmCell codeIndexBasis,
		address owner,
		uint128 remainOnNft,
		uint8 defaultRoyaltyFee,
		address defaultTokenRoot
	)
		public
		OwnableInternal(owner)
		TIP4_1Collection(codeNft)
		TIP4_3Collection(codeIndex, codeIndexBasis)
	{
		tvm.accept();
		_remainOnNft = remainOnNft;
		_defaultRoyaltyFee = defaultRoyaltyFee;
		_defaultTokenRoot = defaultTokenRoot;
	}

	    /** Opens Sale */
    /** Collection Can Only Call This if Owned By Author */
    function openSale(uint8 salePrice) external onlyOwner {
        for (uint256 i = 0; i < _totalSupply; i++) {
			NftTradeable(_resolveNft(i)).openSale{flag: 64}(salePrice);
		}
    }

    /** Closes Sale */
    /** Collection Can only Call this if Owned By Author */
    function closeSale() external onlyOwner {
        for (uint256 i = 0; i < _totalSupply; i++) {
			NftTradeable(_resolveNft(i)).closeSale{flag: 64}();
		}
    }
	
	function mintNft(string[] jsons) public virtual onlyOwner {
        require(
			msg.value > _remainOnNft + (3 ton * jsons.length),
			value_is_less_than_required
		);
		tvm.rawReserve(0, 4);

        for ((string json) : jsons) {
            _mintNft(owner(), json, _defaultRoyaltyFee, _defaultTokenRoot, 3 ton, 0);
        }
    }

	function _mintNft(address owner, string json, uint8 royaltyFee, address tokenRoot, uint128 value, uint16 flag) internal virtual {
		
		uint256 id = uint256(_totalSupply);
		_totalSupply++;

		TvmCell codeNft = _buildNftCode(address(this));
		TvmCell stateNft = _buildNftState(codeNft, id);
		address nftAddr = new NftTradeable{stateInit: stateNft, value: value, flag: flag}(
			royaltyFee,
			tokenRoot,
			owner,
			msg.sender,
			_remainOnNft,
			json,
			_indexDeployValue,
			_indexDestroyValue,
			_codeIndex
		);

		emit NftCreated(id, nftAddr, owner, msg.sender, msg.sender);
	}

	function setRemainOnNft(uint128 remainOnNft) external virtual onlyOwner {
		_remainOnNft = remainOnNft;
	}

	function setDefaultRoyaltyFee(uint8 royaltyFee) external virtual onlyOwner {
		_defaultRoyaltyFee = royaltyFee;
	}

	function _buildNftState(TvmCell code, uint256 id)
		internal
		pure
		virtual
		override
		returns (TvmCell)
	{
		return tvm.buildStateInit({contr: NftTradeable, varInit: {_id: id}, code: code});
	}

	function resolveIndexCodeHash(address collection, address owner) public view returns (uint256 hash) {
		TvmCell code = _buildIndexCode(collection, owner);
		return tvm.hash(code);
	}
}
