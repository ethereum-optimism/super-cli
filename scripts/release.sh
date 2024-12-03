#!/bin/bash

darwin_archs=(
    "x86_64-apple-darwin"
    "aarch64-apple-darwin"
)

linux_archs=(
    "x86_64-unknown-linux-gnu"
    "aarch64-unknown-linux-gnu"
)

windows_archs=(
    "x86_64-pc-windows-msvc"
    "x86_64-pc-windows-gnu"
)

build_darwin() {
    for arch in "${darwin_archs[@]}"; do
        rustup target add $arch
        echo "Building for macos architecture: $arch"
        CLI_BUILD_ARCH=$arch pnpm nx run-many --target=build:bindings --skip-nx-cache
    done
}

build_linux() {
    for arch in "${linux_archs[@]}"; do
        rustup target add $arch
        echo "Building for linux architecture: $arch"
        CLI_BUILD_ARCH=$arch pnpm nx run-many --target=build:bindings --skip-nx-cache
    done
}

build_windows() {
    for arch in "${windows_archs[@]}"; do
        rustup target add $arch
        echo "Building for windows architecture: $arch"
       CLI_BUILD_ARCH=$arch pnpm nx run-many --target=build:bindings --skip-nx-cache
    done
}

generate_node_bindings() {
    case "$OSTYPE" in
        darwin*)
            build_darwin
            ;;
        linux*)
            build_linux
            ;;
        msys*|cygwin*|win32*)
            build_windows
            ;;
        *)
            echo "Unsupported platform: $OSTYPE"
            exit 1
            ;;
    esac
}

generate_node_bindings
