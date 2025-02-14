import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {chainIdByParentChainName} from '@/queries/chains';
import {chainById} from '@/util/chains/chains';
import {zodSupportedNetwork} from '@/util/fetchSuperchainRegistryChainList';
import {Select} from '@inkjs/ui';
import {Box, Text} from 'ink';

export const SelectNetwork = () => {
	const {wizardState, submitSelectNetwork} = useBridgeWizardStore();

	if (wizardState.stepId !== 'select-network') {
		throw new Error('Invalid state');
	}

	return (
		<Box flexDirection="column">
			<Text bold>Select which Superchain network the chain is based on?</Text>
			<Select
				options={zodSupportedNetwork.options.map(network => ({
					label: `${network} (${
						chainById[chainIdByParentChainName[network]]?.name
					})`,
					value: network,
				}))}
				onChange={value => submitSelectNetwork({network: value})}
			/>
		</Box>
	);
};
