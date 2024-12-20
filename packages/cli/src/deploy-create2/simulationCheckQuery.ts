import {
	Address,
	BaseError,
	ContractFunctionRevertedError,
	getAddress,
	Hex,
} from 'viem';
import {Config} from 'wagmi';

import {simulateContract} from '@wagmi/core';
import {CREATEX_ADDRESS, createXABI} from '@/contracts/createx/constants';

export const simulationCheckQueryKey = (
	deterministicAddress: Address,
	initCode: Hex,
	baseSalt: Hex,
	chainId: number,
) => {
	return ['simulationCheck', deterministicAddress, initCode, baseSalt, chainId];
};

export const simulationCheckQueryOptions = (
	wagmiConfig: Config,
	{
		deterministicAddress,
		initCode,
		baseSalt,
		chainId,
	}: {
		deterministicAddress: Address;
		initCode: Hex;
		baseSalt: Hex;
		chainId: number;
	},
) => {
	return {
		queryKey: simulationCheckQueryKey(
			deterministicAddress,
			initCode,
			baseSalt,
			chainId,
		),
		queryFn: async () => {
			try {
				const simulationResult = await simulateContract(wagmiConfig, {
					abi: createXABI,
					// Just a random address
					account: '0x000000000000000000000000000000000000dead',
					address: CREATEX_ADDRESS,
					chainId,
					functionName: 'deployCreate2',
					args: [baseSalt, initCode],
				});

				return {
					isAddressSameAsExpected:
						getAddress(simulationResult.result) ===
						getAddress(deterministicAddress),
				};
			} catch (err) {
				if (err instanceof BaseError) {
					const revertError = err.walk(
						err => err instanceof ContractFunctionRevertedError,
					);

					if (revertError) {
						return {
							isAddressSameAsExpected: true,
						};
					}
				}
				throw err;
			}
		},
	};
};
