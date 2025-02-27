import {Address, Hex} from 'viem';
import {Config} from 'wagmi';

import {getBytecode} from '@wagmi/core';
import {ComputedDeploymentParams} from '@/actions/deploy-create2/types';

export const preVerificationCheckQueryKey = (
	deterministicAddress: Address,
	initCode: Hex,
	baseSalt: Hex,
	chainId: number,
) => {
	return [
		'preVerificationCheck',
		deterministicAddress,
		initCode,
		baseSalt,
		chainId,
	];
};

export const preVerificationCheckQueryOptions = (
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
		queryKey: preVerificationCheckQueryKey(
			deterministicAddress,
			initCode,
			baseSalt,
			chainId,
		),
		queryFn: async () => {
			const bytecode = await getBytecode(wagmiConfig, {
				address: deterministicAddress,
				chainId,
			});

			return {
				isAlreadyDeployed: !!bytecode,
			};
		},
	};
};
