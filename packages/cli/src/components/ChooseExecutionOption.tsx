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
	  }
	| {
			type: 'sponsoredSender';
			apiKey: string;
	  };

export const ChooseExecutionOption = ({
	label,
	onSubmit,
}: {
	label: string;
	onSubmit: (option: ExecutionOption) => void;
}) => {
	const [chosePrivateKey, setChosePrivateKey] = useState(false);
	const [choseSponsoredSender, setChoseSponsoredSender] = useState(false);

	return (
		<Box flexDirection="column" gap={1}>
			<Box gap={1}>
				<Text bold>{label}</Text>
				<Text bold>How would you like to send the transaction?</Text>
			</Box>
			<Select
				options={[
					{label: '🔑 Enter a private key', value: 'privateKey'},
					{
						label: '🔌 Connect a wallet (Metamask / WalletConnect)',
						value: 'externalSigner',
					},
					{
						label: '💰 EthDenver sponsored sender',
						value: 'sponsoredSender',
					},
				]}
				onChange={option => {
					if (option === 'privateKey') {
						setChosePrivateKey(true);
					} else if (option === 'externalSigner') {
						onSubmit({type: 'externalSigner'});
					} else if (option === 'sponsoredSender') {
						setChoseSponsoredSender(true);
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
			{choseSponsoredSender && (
				<ApiKeyInput
					onSubmit={apiKey => {
						onSubmit({type: 'sponsoredSender', apiKey});
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

const ApiKeyInput = ({onSubmit}: {onSubmit: (apiKey: string) => void}) => {
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [resetKey, setResetKey] = useState(0);

	return (
		<Box flexDirection="column">
			<Box>
				<Text bold>Enter your API key for the sponsored sender:</Text>
			</Box>
			<TextInput
				key={resetKey}
				onSubmit={apiKey => {
					if (!apiKey || apiKey.trim() === '') {
						setErrorMessage('API key cannot be empty');
						setResetKey(prev => prev + 1);
						return;
					}

					onSubmit(apiKey.trim());
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
