import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {Select} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {
	SupportedNetwork,
	zodSupportedNetwork,
} from '@/util/fetchSuperchainRegistryChainList';
import {chainIdByParentChainName} from '@/queries/chains';
import {chainById} from '@/util/chains/chains';

export const SelectNetwork = () => {
	const {wizardState, submitSelectNetwork} = useDeployCreate2WizardStore();

	if (wizardState.stepId !== 'select-network') {
		throw new Error('Invalid state');
	}

	return (
		<Box flexDirection="column">
			<Text>Select which network the L2 chain is based on</Text>
			<Select
				options={zodSupportedNetwork.options.map(network => ({
					label: `${network} (${
						chainById[chainIdByParentChainName[network]]?.name
					})`,
					value: network,
				}))}
				onChange={(network: string) =>
					submitSelectNetwork?.({network: network as SupportedNetwork})
				}
			/>
		</Box>
	);
};
