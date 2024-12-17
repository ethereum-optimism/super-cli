import type {AppProps} from 'pastel';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useInput} from 'ink';
import {DbProvider} from '@/db/dbContext';
import {useEffect, useRef} from 'react';
import {Spinner} from '@inkjs/ui';
import {useMappingChainById} from '@/queries/chainById';
import {createWagmiConfig} from '@/createWagmiConfig';
import {WagmiProvider} from 'wagmi';
import {startServer} from '@/server/startServer';

export const queryClient = new QueryClient();

const AppInner = ({children}: {children: React.ReactNode}) => {
	const {data: chainById, isLoading: isChainByIdLoading} =
		useMappingChainById();

	if (isChainByIdLoading || !chainById) {
		return <Spinner label="Loading chain config from Superchain registry..." />;
	}

	const wagmiConfig = createWagmiConfig(chainById);

	return (
		<WagmiProvider config={wagmiConfig}>
			<DbProvider>{children}</DbProvider>
		</WagmiProvider>
	);
};

export default function App({Component, commandProps}: AppProps) {
	const serverRef = useRef<Awaited<ReturnType<typeof startServer>>>();

	useInput((input, key) => {
		if (input === 'c' && key.ctrl) {
			process.exit(0);
		}
	});

	useEffect(() => {
		startServer()
			.then(s => {
				serverRef.current = s;
			})
			.catch(err => {
				console.error('Failed to start server:', err);
				process.exit(1);
			});

		return () => {
			if (serverRef.current) {
				serverRef.current.close(err => {
					if (err) {
						console.error('Error while closing server:', err);
					}
				});
			}
		};
	}, []);

	return (
		<QueryClientProvider client={queryClient}>
			<AppInner>
				<Component {...commandProps} />
			</AppInner>
		</QueryClientProvider>
	);
}
