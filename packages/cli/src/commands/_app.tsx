import type {AppProps} from 'pastel';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useInput} from 'ink';
import {parseToml} from 'toml-parser';

export const queryClient = new QueryClient();

export default function App({Component, commandProps}: AppProps) {
	const toml =parseToml(`
		[package]
name    = "toml-parser"
edition = "2021"
version = "0.0.1"

[lib]
crate-type = ["cdylib"]

[dependencies]
napi         = { workspace = true, default-features = false, features = ["napi3"] }
napi-derive  = { workspace = true }
serde_json = "1.0"
toml = "0.5"

[build-dependencies]
napi-build = { workspace = true }
	`);

	console.log(toml);

	useInput((input, key) => {
		if (input === 'c' && key.ctrl) {
			process.exit();
		}
	});
	return (
		<QueryClientProvider client={queryClient}>
			<Component {...commandProps} />
		</QueryClientProvider>
	);
}
