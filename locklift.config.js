module.exports = {
  compiler: {
    // Path to https://github.com/broxus/TON-Solidity-Compiler
    /// For Local use:
    path: './../TON-Solidity-Compiler/build/solc/solc',
    /// For DevContainer use:
    // path: '/usr/bin/solc-ton'
  },
  linker: {
    // Path to https://github.com/tonlabs/TVM-linker
    /// For Local use:
    path: './../TVM-linker/tvm_linker/target/release/tvm_linker',
    /// For DevContainer use:
    // path: '/usr/bin/tvm_linker'
  },
  networks: {
    // You can use TON labs graphql endpoints or local node
    local: {
      ton_client: {
        // See the TON client specification for all available options
        network: {
          server_address: 'http://localhost/',
        },
      },
      // This giver is default local-node giver
      giver: {
        address: '0:841288ed3b55d9cdafa806807f02a0ae0c169aa5edfe88a789a6482429756a94',
        abi: { "ABI version": 1, "functions": [ { "name": "constructor", "inputs": [], "outputs": [] }, { "name": "sendGrams", "inputs": [ {"name":"dest","type":"address"}, {"name":"amount","type":"uint64"} ], "outputs": [] } ], "events": [], "data": [] },
        key: '',
      },
      // Use tonos-cli to generate your phrase
      // !!! Never commit it in your repos !!!
      keys: {
        phrase: '',
        amount: 20,
      }
    },
    dev: {
      ton_client: {
        network: {
          server_address: 'https://net.ton.dev/',
        },
      },
      giver: {
        address: '0:a4053fd2e9798d0457c9e8f012cef203e49da863d76f36d52d5e2e62c326b217',
        abi: { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [ { "name": "constructor", "inputs": [ ], "outputs": [ ] }, { "name": "sendGrams", "inputs": [ {"name":"dest","type":"address"}, {"name":"amount","type":"uint64"} ], "outputs": [ ] }, { "name": "owner", "inputs": [ ], "outputs": [ {"name":"owner","type":"uint256"} ] } ], "data": [ {"key":1,"name":"owner","type":"uint256"} ], "events": [ ] },
        key: process.env.DEV_GIVER_KEY || ''
      },
      keys: {
        phrase: '',
        amount: 5,
      }
    },
    main: {
      ton_client: {
        network: {
          server_address: 'https://main.ton.dev'
        }
      },
      giver: {
        address: '0:3bcef54ea5fe3e68ac31b17799cdea8b7cffd4da75b0b1a70b93a18b5c87f723',
        abi: { "ABI version": 2, "header": ["pubkey", "time", "expire"], "functions": [ { "name": "constructor", "inputs": [ ], "outputs": [ ] }, { "name": "sendGrams", "inputs": [ {"name":"dest","type":"address"}, {"name":"amount","type":"uint64"} ], "outputs": [ ] }, { "name": "owner", "inputs": [ ], "outputs": [ {"name":"owner","type":"uint256"} ] } ], "data": [ {"key":1,"name":"owner","type":"uint256"} ], "events": [ ] },
        key: process.env.MAIN_GIVER_KEY || ''
      },
      keys: {
        phrase: '',
        amount: 20,
      }
    },  
  },
};