import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {useSuperchainRegistryChainList} from '@/queries/superchainRegistryChainList';
import {MultiSelect, Spinner} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {useState} from 'react';

export const SelectChains = () => {
	const {wizardState, submitSelectChains} = useBridgeWizardStore();

	if (wizardState.stepId !== 'select-chains') {
		throw new Error('Invalid state');
	}

	const {
		data: chains,
		isLoading: isLoadingChains,
		error: loadChainsError,
	} = useSuperchainRegistryChainList();

	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	if (isLoadingChains) {
		return (
			<Box flexDirection="column">
				<Spinner
					label={`Loading chains from superchain registry for ${wizardState.network}...`}
				/>
			</Box>
		);
	}

	if (loadChainsError || !chains) {
		return (
			<Box flexDirection="column">
				<Text color="red">
					❌ Failed to load chains from superchain registry
				</Text>
				<Text color="red">{loadChainsError?.toString()}</Text>
			</Box>
		);
	}

	if (chains.length === 0) {
		return (
			<Box flexDirection="column">
				<Text color="yellow">⚠️ No chains found</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>
				<Text color="cyan" bold>
					Select chains to bridge to{' '}
				</Text>
				<Text color="gray">(</Text>
				<Text color="yellow">↑↓</Text>
				<Text color="gray"> navigate - more below, </Text>
				<Text color="yellow">space</Text>
				<Text color="gray"> select, </Text>
				<Text color="yellow">enter</Text>
				<Text color="gray"> to confirm)</Text>
			</Text>
			<MultiSelect
				options={chains
					.filter(chain => chain.parent.chain === wizardState.network)
					.map(chain => ({
						label: `${chain.name} (${chain.chainId})`,
						value: chain.identifier.split('/')[1]!,
					}))}
				onSubmit={chainNames => {
					if (chainNames.length === 0) {
						setErrorMessage('You must select at least one chain');
						return;
					}

					submitSelectChains({chains: chainNames});
				}}
			/>
			{errorMessage && <Text color="red">{errorMessage}</Text>}
		</Box>
	);
};
