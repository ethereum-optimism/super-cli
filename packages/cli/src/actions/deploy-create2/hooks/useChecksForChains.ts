import {useConfig} from 'wagmi';

import {useQueries} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';
import {DeploymentParams} from '@/actions/deploy-create2/types';

// Gives a handle for the overall check status so the top level component can
// display the appropriate UI
export const useChecksForChains = ({
	intent,
	computedParams,
}: DeploymentParams) => {
	const wagmiConfig = useConfig();

	const preVerificationCheckQueries = useQueries({
		queries: intent.chains.map(chain => {
			return {
				...preVerificationCheckQueryOptions(wagmiConfig, {
					deterministicAddress: computedParams.deterministicAddress,
					initCode: computedParams.initCode,
					baseSalt: computedParams.baseSalt,
					chainId: chain.id,
				}),
			};
		}),
	});

	const simulationQueries = useQueries({
		queries: intent.chains.map(chain => {
			return {
				...simulationCheckQueryOptions(wagmiConfig, {
					deterministicAddress: computedParams.deterministicAddress,
					initCode: computedParams.initCode,
					baseSalt: computedParams.baseSalt,
					chainId: chain.id,
				}),
			};
		}),
	});

	// Simulation reverts if the address is already deployed
	const isSimulationCompleted = simulationQueries.every(
		query => query.isSuccess,
	);

	const isPreVerificationCheckCompleted = preVerificationCheckQueries.every(
		query => query.isSuccess,
	);

	if (isSimulationCompleted && isPreVerificationCheckCompleted) {
		const chainIdsToDeployTo = intent.chains
			.filter(
				(_, i) =>
					!preVerificationCheckQueries[i]!.data!.isAlreadyDeployed &&
					simulationQueries[i]!.data!.isAddressSameAsExpected,
			)
			.map(chain => chain.id);

		return {
			isSimulationCompleted,
			isPreVerificationCheckCompleted,
			chainIdsToDeployTo,
		};
	}

	return {
		isSimulationCompleted,
		isPreVerificationCheckCompleted,
		chainIdsToDeployTo: undefined,
	};
};
