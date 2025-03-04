import {Address} from 'viem';
import {useConfig} from 'wagmi';

import {useQueries} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';
import {DeploymentParams} from '@/actions/deploy-create2/types';

export const useChecksForChainsForContracts = (
	deployments: DeploymentParams[],
) => {
	const wagmiConfig = useConfig();

	const flattenedDeployments = deployments.flatMap(deployment => {
		return deployment.intent.chains.map(chain => ({
			...deployment,
			chain,
		}));
	});

	const preVerificationCheckQueries = useQueries({
		queries: flattenedDeployments.map(({chain, computedParams}) => ({
			...preVerificationCheckQueryOptions(wagmiConfig, {
				deterministicAddress: computedParams.deterministicAddress,
				initCode: computedParams.initCode,
				baseSalt: computedParams.baseSalt,
				chainId: chain.id,
			}),
		})),
	});

	const simulationQueries = useQueries({
		queries: flattenedDeployments.map(({chain, computedParams}) => ({
			...simulationCheckQueryOptions(wagmiConfig, {
				deterministicAddress: computedParams.deterministicAddress,
				initCode: computedParams.initCode,
				baseSalt: computedParams.baseSalt,
				chainId: chain.id,
			}),
		})),
	});

	const isSimulationCompleted = simulationQueries.every(
		query => query.isSuccess,
	);

	const isPreVerificationCheckCompleted = preVerificationCheckQueries.every(
		query => query.isSuccess,
	);

	if (isSimulationCompleted && isPreVerificationCheckCompleted) {
		const shouldDeployArr = flattenedDeployments.map((_, i) => {
			return (
				!preVerificationCheckQueries[i]!.data!.isAlreadyDeployed &&
				simulationQueries[i]!.data!.isAddressSameAsExpected
			);
		});

		const chainIdSetByAddress = deployments.reduce<
			Record<Address, Set<number>>
		>((acc, deployment, deploymentIndex) => {
			acc[deployment.computedParams.deterministicAddress] = new Set(
				deployment.intent.chains
					.filter((_, chainIndex) => {
						const queryIndex =
							deploymentIndex * deployment.intent.chains.length + chainIndex;
						return shouldDeployArr[queryIndex]!;
					})
					.map(chain => chain.id),
			);
			return acc;
		}, {});

		return {
			isSimulationCompleted,
			isPreVerificationCheckCompleted,
			chainIdSetByAddress,
			hasDeployableChains: shouldDeployArr.some(shouldDeploy => shouldDeploy),
		};
	}

	return {
		isSimulationCompleted,
		isPreVerificationCheckCompleted,
		chainIdSetByAddress: undefined,
		hasDeployableChains: undefined,
	};
};
