# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.231.2/containers/rust/.devcontainer/base.Dockerfile

# [Choice] Debian OS version (use bullseye on local arm64/Apple Silicon): buster, bullseye
ARG VARIANT="buster"
FROM mcr.microsoft.com/vscode/devcontainers/rust:0-${VARIANT}

# [Optional] Uncomment this section to install additional packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# Install TON Solidity Compiler
ARG TONC_VER=0.57.1
RUN git clone --depth 1 --branch ${TONC_VER} https://github.com/tonlabs/TON-Solidity-Compiler \
    && cd TON-Solidity-Compiler \
    && sh ./compiler/scripts/install_deps.sh \
    && mkdir build \
    && cd build \
    && cmake ../compiler/ -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . -- -j8

# Install TON Linker 
RUN git clone https://github.com/tonlabs/TVM-linker.git \
    && cd TVM-linker \
    && cargo build --release 

# Copy Bin Add Linker
RUN cp TON-Solidity-Compiler/build/solc/solc /usr/bin/solc-ton \
    && cp TON-Solidity-Compiler/lib/stdlib_sol.tvm /usr/lib \
    && cp TVM-linker/target/release/tvm_linker /usr/bin/tvm_linker

ENV TVM_LINKER_LIB_PATH=/usr/lib/stdlib_sol.tvm

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
