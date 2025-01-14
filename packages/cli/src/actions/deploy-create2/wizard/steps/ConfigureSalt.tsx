import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';
export const ConfigureSalt = () => {
	const {wizardState, submitConfigureSalt} = useDeployCreate2WizardStore();

	if (wizardState.stepId !== 'configure-salt') {
		throw new Error('Invalid state');
	}

	return (
		<Box flexDirection="column">
			<Box>
				<Text>Enter a salt value (press Enter to confirm):</Text>
			</Box>
			<TextInput
				onSubmit={salt => submitConfigureSalt({salt})}
				defaultValue={'ethers phoenix'}
			/>
		</Box>
	);
};
