#/bin/bash
git clone --depth 1 --branch 0.57.1 https://github.com/tonlabs/TON-Solidity-Compiler \
    && cd TON-Solidity-Compiler \
    && sh ./compiler/scripts/install_deps.sh \
    && mkdir build \
    && cd build \
    && cmake ../compiler/ -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . -- -j8