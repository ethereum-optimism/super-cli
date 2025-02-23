import {
	Broadcast,
	MultichainBroadcast,
	writeMultichainBroadcast,
} from '@/util/broadcasts';
import {CREATEX_ADDRESS, createXABI} from '@/util/createx/constants';
import {fromFoundryArtifactPath} from '@/util/forge/foundryProject';

import {runOperation, runOperationsMany} from '@/stores/operationStore';
import {requestTransactionTask} from '@/stores/transactionTaskStore';
import {Config, getTransaction, waitForTransactionReceipt} from '@wagmi/core';
import {Address, Chain, encodeFunctionData, Hex} from 'viem';
import {TxSender} from '@/util/TxSender';

export const executeTransactionOperation = ({
	chainId,
	deterministicAddress,
	initCode,
	baseSalt,
	txSender,
}: {
	chainId: number;
	deterministicAddress: Address;
	initCode: Hex;
	baseSalt: Hex;
	txSender?: TxSender;
}) => {
	return {
		key: ['executeTransaction', chainId, deterministicAddress],
		fn: async () => {
			if (txSender) {
				return await txSender.sendTx({
					chainId,
					to: CREATEX_ADDRESS,
					data: encodeFunctionData({
						abi: createXABI,
						functionName: 'deployCreate2',
						args: [baseSalt, initCode],
					}),
				});
			}
			return await requestTransactionTask({
				chainId,
				to: CREATEX_ADDRESS,
				data: encodeFunctionData({
					abi: createXABI,
					functionName: 'deployCreate2',
					args: [baseSalt, initCode],
				}),
			});
		},
	};
};

export const writeBroadcastArtifactOperation = ({
	foundryArtifactPath,
	contractArguments,
	deterministicAddress,
	broadcasts,
}: {
	foundryArtifactPath: string;
	contractArguments: string[];
	deterministicAddress: Address;
	broadcasts: Broadcast[];
}) => {
	return {
		key: ['writeBroadcastArtifact', foundryArtifactPath, deterministicAddress],
		fn: async () => {
			const {foundryProject, contractFileName} = await fromFoundryArtifactPath(
				foundryArtifactPath,
			);

			const multichainBroadcast: MultichainBroadcast = {
				name: contractFileName,
				address: deterministicAddress,
				timestamp: Math.floor(Date.now() / 1000),
				type: 'CREATE2',
				contractArguments,
				foundryProjectRoot: foundryProject.baseDir,
				transactions: broadcasts.reduce((acc, broadcast) => {
					acc[broadcast.chainId] = broadcast;
					return acc;
				}, {} as Record<number, Broadcast>),
			};

			await writeMultichainBroadcast(multichainBroadcast);
		},
	};
};

export const deployCreate2 = async ({
	wagmiConfig,
	deterministicAddress,
	initCode,
	baseSalt,
	chains,
	foundryArtifactPath,
	contractArguments,
	txSender,
}: {
	wagmiConfig: Config;
	deterministicAddress: Address;
	initCode: Hex;
	baseSalt: Hex;
	chains: Chain[];
	foundryArtifactPath: string;
	contractArguments: string[];
	txSender?: TxSender;
}) => {
	const transactionHashes = await runOperationsMany(
		chains.map(chain =>
			executeTransactionOperation({
				chainId: chain.id,
				deterministicAddress,
				initCode,
				baseSalt,
				txSender,
			}),
		),
	);

	const receipts = await Promise.all(
		chains.map(async (chain, i) => {
			const receipt = await waitForTransactionReceipt(wagmiConfig, {
				chainId: chain.id,
				hash: transactionHashes[i]!,
			});

			return receipt;
		}),
	);

	const transactions = await Promise.all(
		chains.map(async (chain, i) => {
			const transaction = await getTransaction(wagmiConfig, {
				chainId: chain.id,
				hash: transactionHashes[i]!,
			});

			return transaction;
		}),
	);

	const broadcasts = transactions.map((transaction, i) => ({
		chainId: chains[i]!.id,
		hash: transactionHashes[i]!,
		transaction,
		receipt: receipts[i]!,
	}));

	await runOperation(
		writeBroadcastArtifactOperation({
			foundryArtifactPath,
			contractArguments,
			deterministicAddress,
			broadcasts,
		}),
	);

	return broadcasts;
};
