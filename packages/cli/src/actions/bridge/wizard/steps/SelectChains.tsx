import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {rollupChainToIdentifier} from '@/util/chains/chainIdentifier';
import {networkByName} from '@/util/chains/networks';
import {MultiSelect} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {useState} from 'react';

export const SelectChains = () => {
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const {wizardState, submitSelectChains} = useBridgeWizardStore();

	if (wizardState.stepId !== 'select-chains') {
		throw new Error('Invalid state');
	}

	const network = networkByName[wizardState.network]!;

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
				options={network.chains.map(chain => ({
					label: `${chain.name} (${chain.id})`,
					value: rollupChainToIdentifier(chain).split('/')[1]!,
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
