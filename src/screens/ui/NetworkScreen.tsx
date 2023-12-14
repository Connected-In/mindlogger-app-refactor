import { useColorScheme } from 'react-native';

import NetworkLogger, {
  startNetworkLogging,
} from 'react-native-network-logger';

startNetworkLogging({
  ignoredPatterns: [/^.+?google\.com\/.+$/],
});

function NetworkScreen() {
  const scheme = useColorScheme() ?? undefined;

  return <NetworkLogger theme={scheme} />;
}

export default NetworkScreen;
