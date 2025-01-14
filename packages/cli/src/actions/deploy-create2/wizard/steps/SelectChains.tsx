import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {useSuperchainRegistryChainList} from '@/queries/superchainRegistryChainList';
import {MultiSelect, Spinner} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {useState} from 'react';

export const SelectChains = () => {
	const {wizardState, submitSelectChains} = useDeployCreate2WizardStore();

	const {data: chains, isLoading, error} = useSuperchainRegistryChainList();

	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	if (wizardState.stepId !== 'select-chains') {
		throw new Error('Invalid step');
	}

	if (isLoading) {
		return (
			<Box flexDirection="column">
				<Spinner label="Loading chains from superchain registry..." />
			</Box>
		);
	}

	if (error || !chains) {
		return (
			<Box flexDirection="column">
				<Text color="red">
					❌ Failed to load chains from superchain registry
				</Text>
				{error && <Text>{error.toString()}</Text>}
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
				<Text color="cyan">Select chains to deploy to</Text>
				<Text color="gray"> (</Text>
				<Text color="yellow">↑↓</Text>
				<Text color="gray"> to navigate, </Text>
				<Text color="yellow">space</Text>
				<Text color="gray"> to select, </Text>
				<Text color="yellow">enter</Text>
				<Text color="gray"> to confirm, more options available below </Text>
				<Text color="yellow">↓</Text>
				<Text color="gray">)</Text>
			</Text>
			<MultiSelect
				options={chains
					.filter(chain => chain.parent.chain === wizardState.network)
					.map(chain => ({
						label: chain.name,
						value: chain.identifier.split('/')[1]!,
					}))}
				onSubmit={chainNames => {
					if (chainNames.length === 0) {
						setErrorMessage('You must select at least one chain');
						return;
					}

					submitSelectChains({chainNames});
				}}
			/>
			{errorMessage && <Text color="red">{errorMessage}</Text>}
		</Box>
	);
};
