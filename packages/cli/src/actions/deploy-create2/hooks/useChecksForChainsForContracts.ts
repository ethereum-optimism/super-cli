import {Address, Hex} from 'viem';
import {useConfig} from 'wagmi';

import {useQueries} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';

type DeploymentParams = {
	deterministicAddress: Address;
	initCode: Hex;
	baseSalt: Hex;
	chainIds: number[];
};

export const useChecksForChainsForContracts = (
	deployments: DeploymentParams[],
) => {
	const wagmiConfig = useConfig();

	const preVerificationCheckQueries = useQueries({
		queries: deployments.flatMap(deployment =>
			deployment.chainIds.map(chainId => ({
				...preVerificationCheckQueryOptions(wagmiConfig, {
					deterministicAddress: deployment.deterministicAddress,
					initCode: deployment.initCode,
					baseSalt: deployment.baseSalt,
					chainId,
				}),
			})),
		),
	});

	const simulationQueries = useQueries({
		queries: deployments.flatMap(deployment =>
			deployment.chainIds.map(chainId => ({
				...simulationCheckQueryOptions(wagmiConfig, {
					deterministicAddress: deployment.deterministicAddress,
					initCode: deployment.initCode,
					baseSalt: deployment.baseSalt,
					chainId,
				}),
			})),
		),
	});

	const isSimulationCompleted = simulationQueries.every(
		query => query.isSuccess,
	);

	const isPreVerificationCheckCompleted = preVerificationCheckQueries.every(
		query => query.isSuccess,
	);

	if (isSimulationCompleted && isPreVerificationCheckCompleted) {
		const chainIdArraysPerContract = deployments.map(
			(deployment, deploymentIndex) =>
				deployment.chainIds.filter((chainId, chainIndex) => {
					const queryIndex =
						deploymentIndex * deployment.chainIds.length + chainIndex;
					return (
						!preVerificationCheckQueries[queryIndex]!.data!.isAlreadyDeployed &&
						simulationQueries[queryIndex]!.data!.isAddressSameAsExpected
					);
				}),
		);

		return {
			isSimulationCompleted,
			isPreVerificationCheckCompleted,
			chainIdArraysPerContract,
		};
	}

	return {
		isSimulationCompleted,
		isPreVerificationCheckCompleted,
		chainsToDeployTo: undefined,
	};
};
