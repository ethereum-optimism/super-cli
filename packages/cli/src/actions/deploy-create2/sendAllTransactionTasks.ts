import {wagmiConfig} from '@/commands/_app';
import {
	onTaskSuccess,
	useTransactionTaskStore,
} from '@/stores/transactionTaskStore';
import {chainById} from '@/util/chains/chains';
import {http, sendTransaction} from '@wagmi/core';
import {createWalletClient, zeroAddress} from 'viem';
import {PrivateKeyAccount} from 'viem/accounts';

export const sendAllTransactionTasksWithPrivateKeyAccount = async (
	account: PrivateKeyAccount,
) => {
	const taskEntryById = useTransactionTaskStore.getState().taskEntryById;

	await Promise.all(
		Object.values(taskEntryById).map(async task => {
			const hash = await sendTransaction(wagmiConfig, {
				to: task.request.to,
				data: task.request.data,
				account,
				chainId: task.request.chainId,
			});

			onTaskSuccess(task.id, hash);
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
