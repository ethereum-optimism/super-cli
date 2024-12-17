import {Address, Hex} from 'viem';
import {useConfig} from 'wagmi';

import {useQueries} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/deploy-create2/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/deploy-create2/simulationCheckQuery';

// Gives a handle for the overall check status so the top level component can
// display the appropriate UI
export const useChecksForChains = ({
	deterministicAddress,
	initCode,
	baseSalt,
	chainIds,
}: {
	deterministicAddress: Address;
	initCode: Hex;
	baseSalt: Hex;
	chainIds: number[];
}) => {
	const wagmiConfig = useConfig();

	const preVerificationCheckQueries = useQueries({
		queries: chainIds.map(chainId => {
			return {
				...preVerificationCheckQueryOptions(wagmiConfig, {
					deterministicAddress,
					initCode,
					baseSalt,
					chainId,
				}),
			};
		}),
	});

	const simulationQueries = useQueries({
		queries: chainIds.map(chainId => {
			return {
				...simulationCheckQueryOptions(wagmiConfig, {
					deterministicAddress,
					initCode,
					baseSalt,
					chainId,
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
		const chainsToDeployTo = chainIds.filter(
			(_, i) =>
				!preVerificationCheckQueries[i]!.data!.isAlreadyDeployed &&
				simulationQueries[i]!.data!.isAddressSameAsExpected,
		);

		return {
			isSimulationCompleted,
			isPreVerificationCheckCompleted,
			chainsToDeployTo,
		};
	}

	return {
		isSimulationCompleted,
		isPreVerificationCheckCompleted,
		chainsToDeployTo: undefined,
	};
};
