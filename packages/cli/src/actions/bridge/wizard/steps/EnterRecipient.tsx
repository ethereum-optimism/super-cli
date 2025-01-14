import {Box, Text} from 'ink';
import {TextInput} from '@inkjs/ui';

import {useBridgeWizardStore} from '@/actions/bridge/wizard/bridgeWizardStore';
import {useState} from 'react';
import {isAddress} from 'viem';
import {zodAddress} from '@/lib/schemas';

export const EnterRecipient = () => {
	const {submitEnterRecipient} = useBridgeWizardStore();

	const [errorMessage, setErrorMessage] = useState<string>('');
	const [resetKey, setResetKey] = useState(0);

	return (
		<Box flexDirection="column">
			<Box>
				<Text>Enter the recipient address:</Text>
			</Box>
			<TextInput
				key={resetKey}
				onSubmit={address => {
					if (!isAddress(address)) {
						setErrorMessage('Invalid address: must start with 0x');
						setResetKey(prev => prev + 1);
						return;
					}

					const result = zodAddress.safeParse(address);

					if (!result.success) {
						setErrorMessage(result.error.message);
						setResetKey(prev => prev + 1);
						return;
					}

					submitEnterRecipient({recipient: result.data});
				}}
			/>
			{errorMessage && (
				<Box>
					<Text color="red">{errorMessage ? `❌ ${errorMessage}` : ' '}</Text>
				</Box>
			)}
		</Box>
	);
};
