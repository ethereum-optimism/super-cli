import {wagmiConfig} from '@/commands/_app';
import {
	onTaskSuccess,
	useTransactionTaskStore,
} from '@/stores/transactionTaskStore';
import {chainById} from '@/util/chains/chains';
import {TxSender} from '@/util/TxSender';
import {http, sendTransaction} from '@wagmi/core';
import {createWalletClient, zeroAddress} from 'viem';
import {PrivateKeyAccount} from 'viem/accounts';

export const sendAllTransactionTasks = async (txSender: TxSender) => {
	const taskEntryById = useTransactionTaskStore.getState().taskEntryById;

	await Promise.all(
		Object.values(taskEntryById).map(async task => {
			const hash = await txSender.sendTx(task.request);
			onTaskSuccess(task.id, hash);
		}),
	);
};

export const sendAllTransactionTasksWithPrivateKeyAccount = async (
	account: PrivateKeyAccount,
) => {
	const taskEntryById = useTransactionTaskStore.getState().taskEntryById;

	// Group transactions by chainId
	const tasksByChain = Object.values(taskEntryById).reduce((acc, task) => {
		const chainId = task.request.chainId;
		if (!acc[chainId]) {
			acc[chainId] = [];
		}
		acc[chainId].push(task);
		return acc;
	}, {} as Record<number, (typeof taskEntryById)[string][]>);

	// Process each chain's transactions sequentially, but different chains can run in parallel
	await Promise.all(
		Object.entries(tasksByChain).map(async ([_, chainTasks]) => {
			for (const task of chainTasks) {
				const hash = await sendTransaction(wagmiConfig, {
					to: task.request.to,
					data: task.request.data,
					account,
					chainId: task.request.chainId,
				});

				onTaskSuccess(task.id, hash);
			}
		}),
	);
};

export const sendAllTransactionTasksWithCustomWalletRpc = async (
	getRpcUrl: (chainId: number) => string,
) => {
	const taskEntryById = useTransactionTaskStore.getState().taskEntryById;

	await Promise.all(
		Object.values(taskEntryById).map(async task => {
			const chain = chainById[task.request.chainId];
			if (!chain) {
				throw new Error(`Chain ${task.request.chainId} not found`);
			}

			const walletClient = createWalletClient({
				transport: http(getRpcUrl(chain.id)),
			});

			const hash = await walletClient.sendTransaction({
				to: task.request.to,
				data: task.request.data,
				account: zeroAddress, // will be ignored
				chain,
			});

			onTaskSuccess(task.id, hash);
		}),
	);
};
