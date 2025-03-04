import {AsyncQueue} from '@/util/AsyncQueue';
import {chainById} from '@/util/chains/chains';
import {TransactionTask} from '@/util/transactionTask';
import {sendTransaction, waitForTransactionReceipt} from '@wagmi/core';
import {
	createWalletClient,
	Hash,
	http,
	PrivateKeyAccount,
	zeroAddress,
} from 'viem';
import {Config} from 'wagmi';

type WalletRpcUrlFactory = (chainId: number) => string;

type TxSenderTx = TransactionTask;

export interface TxSender {
	sendTx: (tx: TxSenderTx) => Promise<Hash>;
}

export const createTxSenderFromPrivateKeyAccount = (
	config: Config,
	account: PrivateKeyAccount,
): TxSender => {
	const queueByChainId = {} as Record<number, AsyncQueue<TxSenderTx, Hash>>;

	config.chains.forEach(chain => {
		queueByChainId[chain.id] = new AsyncQueue<TxSenderTx, Hash>(async tx => {
			const hash = await sendTransaction(config, {
				chainId: tx.chainId,
				to: tx.to,
				data: tx.data,
				account,
			});
			// Prevent replacement tx.
			await waitForTransactionReceipt(config, {
				hash,
				chainId: tx.chainId,
				pollingInterval: 1000,
			});

			return hash;
		});
	});

	return {
		sendTx: async tx => {
			if (!queueByChainId[tx.chainId]) {
				throw new Error(`Chain tx queue for ${tx.chainId} not found`);
			}
			return await queueByChainId[tx.chainId]!.enqueue(tx);
		},
	};
};

export const createTxSenderFromCustomWalletRpc = (
	getRpcUrl: WalletRpcUrlFactory,
): TxSender => {
	return {
		sendTx: async tx => {
			const chain = chainById[tx.chainId];
			if (!chain) {
				throw new Error(`Chain not found for ${tx.chainId}`);
			}
			const walletClient = createWalletClient({
				transport: http(getRpcUrl(tx.chainId)),
			});
			return await walletClient.sendTransaction({
				to: tx.to,
				data: tx.data,
				account: zeroAddress, // will be ignored
				chain: chain,
			});
		},
	};
};
