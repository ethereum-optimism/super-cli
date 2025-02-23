# ⚡️ `sup` - Superchain CLI

`sup` is a CLI tool to help deploy and manage contracts on the Superchain.

**WIP** This is a work in progress it is not ready to be consumed!

## ✨ Features

- 🤝 works with existing `foundry` projects (`sup` is a companion, not a replacement to `foundry`)
- 🕹️ interactive mode (no more juggling cli flags)
- 🚀 deploy and verify **multiple** contracts to **multiple** chains at once
- 💸 bridge funds to multiple chains at once (no more "how do I get gas on all of these chains?")
- 🔑 use connected wallets (Metamask / WalletConnect) to deploy contracts (no more `.env` files with private keys)

## 🚀 Getting started

### 1. Install prerequisites: `node.js`

Follow [this guide](https://nodejs.org/en/download) to install Node.js.

### 2. Install `sup`

```sh
npm i -g @eth-optimism/super-cli
```

### 3. Run the CLI

```bash
sup
```

## 🔀 First steps

### Deploy a contract from a `foundry` project

WIP

## RPC URL Override

You can override the RPC URL by setting the `{name}_RPC_URL` environment variable.

For example, lets say we wanted to override OP & Base Mainnet

```
OP_RPC_URL=...
BASE_RPC_URL=...
```

### ❓ Is `sup` a replacement for `foundry`?

Nope, `foundry` is great! `sup` is meant to be a lightweight add-on tool to help with the annoyances of multichain development. It works with your existing `foundry` project, and expects you to use `foundry` to build contracts. It even emits the same broadcast artifacts when you deploy contracts.
