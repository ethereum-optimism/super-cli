import {
	Address,
	BaseError,
	ContractFunctionRevertedError,
	getAddress,
	Hex,
	zeroAddress,
} from 'viem';
import {Config} from 'wagmi';

import {simulateContract} from '@wagmi/core';
import {CREATEX_ADDRESS, createXABI} from '@/util/createx/constants';
import {supersimNetwork} from '@/util/chains/networks';
import {ComputedDeploymentParams} from '@/actions/deploy-create2/types';

// Heuristics for funded accounts on chains
const getFundedAccountForChain = (chainId: number) => {
	// @ts-expect-error
	if (supersimNetwork.chains.map(c => c.id).includes(chainId)) {
		return '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
	}

	return zeroAddress;
};

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
	}: ComputedDeploymentParams & {
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
					account: getFundedAccountForChain(chainId),
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
