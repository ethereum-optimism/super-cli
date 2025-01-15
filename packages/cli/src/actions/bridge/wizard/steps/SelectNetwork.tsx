import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {SupportedNetwork} from '@/lib/fetchSuperchainRegistryChainList';
import {Select} from '@inkjs/ui';
import {Box, Text} from 'ink';

const supportedNetworks: SupportedNetwork[] = ['mainnet', 'sepolia'];

export const SelectNetwork = () => {
	const {wizardState, submitSelectNetwork} = useBridgeWizardStore();

	if (wizardState.stepId !== 'select-network') {
		throw new Error('Invalid state');
	}

	return (
		<Box flexDirection="column">
			<Text bold>Which L1 network do you want to bridge from?</Text>
			<Select
				options={supportedNetworks.map(network => ({
					label: network,
					value: network,
				}))}
				onChange={value => submitSelectNetwork({network: value})}
			/>
		</Box>
	);
};
