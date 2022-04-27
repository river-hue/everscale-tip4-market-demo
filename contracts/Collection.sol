pragma ton-solidity =0.57.1;

pragma AbiHeader expire;
pragma AbiHeader time;
pragma AbiHeader pubkey;

import "./modules/TIP4_3/TIP4_3Collection.sol";
import "./Nft.sol";

contract Collection is TIP4_3Collection {
	/// _remainOnNft - the number of crystals that will remain after the entire mint
	/// process is completed on the Nft contract
	uint128 _remainOnNft;

	constructor(
		TvmCell codeNft,
		TvmCell codeIndex,
		TvmCell codeIndexBasis,
		address ownerPubkey,
		uint128 remainOnNft
	)
		public
		TIP4_1Collection(codeNft)
		TIP4_3Collection(codeIndex, codeIndexBasis, ownerPubkey)
	{
		tvm.accept();
		_remainOnNft = remainOnNft;
	}

	function _mintNft(address owner, string json) internal virtual {
		require(
			msg.value > _remainOnNft + 0.1 ton,
			CollectionErrors.value_is_less_than_required
		);
		tvm.rawReserve(msg.value, 1);

		uint256 id = uint256(_totalSupply);
		_totalSupply++;

		TvmCell codeNft = _buildNftCode(address(this));
		TvmCell stateNft = _buildNftState(codeNft, id);
		address nftAddr = new Nft{stateInit: stateNft, value: 0, flag: 128}(
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

	function _nftAddress(uint256 id) internal view returns (address nft) {
		return (resolveNft(address(this), id));
	}

	function _buildNftState(TvmCell code, uint256 id)
		internal
		pure
		virtual
		override
		returns (TvmCell)
	{
		return tvm.buildStateInit({contr: Nft, varInit: {_id: id}, code: code});
	}

	function resolveIndexCodeHash(address collection, address owner) public view returns (uint256 hash) {
		TvmCell code = _buildIndexCode(collection, owner);
		return tvm.hash(code);
	}
}
