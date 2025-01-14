import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';
import {ConfirmInput} from '@inkjs/ui';
import {Box, Text} from 'ink';

export const ShouldVerifyContract = () => {
	const {wizardState, submitShouldVerifyContract} =
		useDeployCreate2WizardStore();

	if (wizardState.stepId !== 'should-verify-contract') {
		throw new Error('Invalid state');
	}

	return (
		<Box paddingX={1} gap={1}>
			<Text>Do you want to verify the contract on the block explorer?</Text>
			<ConfirmInput
				onConfirm={() => {
					submitShouldVerifyContract({shouldVerifyContract: true});
				}}
				onCancel={() => {
					submitShouldVerifyContract({shouldVerifyContract: false});
				}}
			/>
		</Box>
	);
};
