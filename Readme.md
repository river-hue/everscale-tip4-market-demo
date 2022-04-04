# Everscale Demo NFT Market (TIP4)

## Development

[DevContainer](https://code.visualstudio.com/docs/remote/containers) in [VsCode](https://code.visualstudio.com/):
- Install [Docker](https://www.docker.com/get-started/)
- [Remote Containers Extention](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

Local:
- Install [Docker](https://www.docker.com/get-started/)
- Install [Rust Stable (Rustup)](https://rustup.rs/)
- Install [npm](https://www.npmjs.com/)
- Install [TON Solidity Compiler (v.0.57.1)](https://github.com/tonlabs/TON-Solidity-Compiler.git)
- Install [TVM linker](https://github.com/tonlabs/TVM-linker/releases/tag/0.14.2)
- Install  [TON locklift](https://github.com/broxus/ton-locklift)
- Install [tonos-cli](https://github.com/tonlabs/tonos-cli)

## Tests
```bash
# Install TONC and TVM-Linker
sh ./scripts/install_tonc.sh
sh ./scripts/install_tvm_linker.sh
# Install Dependencies
npm install
# Run Local Node
docker run -d --name local-node -e USER_AGREEMENT=yes -p80:80 tonlabs/local-node
# Run Tests
npm test
```