import {Box, Text} from 'ink';
import {useState} from 'react';

import {Select, TextInput} from '@inkjs/ui';

import {Hex, isHex} from 'viem';

import {privateKeyToAccount, PrivateKeyToAccountErrorType} from 'viem/accounts';

export type ExecutionOption =
	| {
			type: 'privateKey';
			privateKey: Hex;
	  }
	| {
			type: 'externalSigner';
	  };

export const ChooseExecutionOption = ({
	onSubmit,
}: {
	onSubmit: (option: ExecutionOption) => void;
}) => {
	const [chosePrivateKey, setChosePrivateKey] = useState(false);
	return (
		<Box flexDirection="column" gap={1}>
			<Box gap={1}>
				<Text bold>🚀 Ready to deploy!</Text>
				<Text bold>How would you like to deploy?</Text>
			</Box>
			<Select
				options={[
					{label: '🔑 Enter a private key', value: 'privateKey'},
					{
						label: '🔌 Connect a wallet (Metamask / WalletConnect)',
						value: 'externalSigner',
					},
				]}
				onChange={option => {
					if (option === 'privateKey') {
						setChosePrivateKey(true);
					} else if (option === 'externalSigner') {
						onSubmit({type: 'externalSigner'});
					}
				}}
			/>
			{chosePrivateKey && (
				<PrivateKeyInput
					onSubmit={privateKey => {
						onSubmit({type: 'privateKey', privateKey});
					}}
				/>
			)}
		</Box>
	);
};

const PrivateKeyInput = ({onSubmit}: {onSubmit: (privateKey: Hex) => void}) => {
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [resetKey, setResetKey] = useState(0);

	return (
		<Box flexDirection="column">
			<Box>
				<Text bold>Enter your private key for your account:</Text>
			</Box>
			<TextInput
				key={resetKey}
				onSubmit={privateKey => {
					if (!isHex(privateKey)) {
						setErrorMessage('Invalid private key: must start with 0x');
						setResetKey(prev => prev + 1);
						return;
					}

					try {
						privateKeyToAccount(privateKey);
					} catch (err) {
						const error = err as PrivateKeyToAccountErrorType;
						setErrorMessage(
							// @ts-expect-error
							`Invalid private key: ${error.shortMessage ?? error.message}`,
						);
						setResetKey(prev => prev + 1);
						return;
					}

					onSubmit(privateKey);
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
