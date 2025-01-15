import {BridgeWizard} from '@/actions/bridge/wizard/BridgeWizard';
import {DeployCreate2Wizard} from '@/actions/deploy-create2/wizard/DeployCreate2Wizard';
import {Select} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {useState} from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {useUserContext} from '@/queries/userContext';
import {actionDescriptionByWizardId} from '@/models/userContext';
import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {useDeployCreate2WizardStore} from '@/actions/deploy-create2/wizard/deployCreate2WizardStore';

const options = [
	{label: '🚀 Deploy a contract', value: 'deploy'},
	{label: '🌉 Bridge assets', value: 'bridge'},
	// {label: '✅ Verify a contract', value: 'verify'},
];

export default function DefaultEntrypoint() {
	const [selectedOption, setSelectedOption] = useState<
		'bridge' | 'deploy' | 'verify' | 'continue' | null
	>(null);

	const {data: userContext, isLoading: isUserContextLoading} = useUserContext();

	if (isUserContextLoading || !userContext) {
		return null;
	}

	const {lastWizardId, lastWizardState} = userContext;

	const optionsWithLastAction = lastWizardId
		? [
				{
					label: `🔄 Pick up where you left off: ${actionDescriptionByWizardId[lastWizardId]}`,
					value: 'continue',
				},
				...options,
		  ]
		: options;

	if (!selectedOption) {
		return (
			<Box flexDirection="column" padding={1}>
				<Gradient name="passion">
					<BigText text="SUP" font="3d" />
				</Gradient>
				<Box marginBottom={1}>
					<Text bold>
						Sup, what would you like to do on the Superchain today? ✨
					</Text>
				</Box>
				<Select
					options={optionsWithLastAction}
					onChange={value => {
						if (value === 'continue') {
							if (lastWizardId === 'deployCreate2') {
								useDeployCreate2WizardStore
									.getState()
									.setWizardState(lastWizardState as any);
								setSelectedOption('deploy');
								return;
							} else if (lastWizardId === 'bridge') {
								useBridgeWizardStore
									.getState()
									.setWizardState(lastWizardState as any);
								setSelectedOption('bridge');
								return;
							}
						}
						setSelectedOption(
							value as 'bridge' | 'deploy' | 'verify' | 'continue',
						);
					}}
				/>
			</Box>
		);
	}

	if (selectedOption === 'deploy') {
		return <DeployCreate2Wizard />;
	} else if (selectedOption === 'bridge') {
		return <BridgeWizard />;
	}
	return null;
}
