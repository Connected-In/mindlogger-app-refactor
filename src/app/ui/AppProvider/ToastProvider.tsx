import { FC, PropsWithChildren } from 'react';

import { styled } from '@tamagui/core';
import { ToastProvider as RNTNToastProvider } from 'react-native-toast-notifications';

import { colors } from '@app/shared/lib';
import {
  Box,
  Text,
  MaterialAlertOctagon,
  OcticonsCircleCheckFill,
} from '@app/shared/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

const ToastButton = styled(Box, {
  bg: '$greyTsp',
  minHeight: 50,
  borderRadius: 5,
  justifyContent: 'center',
  padding: 10,
});

export type ToastProps = {
  message: string | JSX.Element;
  icon?: React.ReactNode;
  type?: string;
};

const Toast: FC<ToastProps> = ({ message }) => (
  <Box width="100%" pr={10} pl={10}>
    <ToastButton>
      <Text color="$white" fontSize={18}>
        {message}
      </Text>
    </ToastButton>
  </Box>
);

const getDefaultBannerProps = (props: ToastProps) => {
  let type = props.type?.replace('banner', '').toLowerCase(),
    icon = props.icon,
    bgColor = '';

  switch (type) {
    case 'success':
      icon = <OcticonsCircleCheckFill color={colors.alertSuccess} size={24} />;
      bgColor = colors.alertSuccessBg;
      break;
    case 'danger':
      icon = <MaterialAlertOctagon color={colors.alertError} size={26} />;
      bgColor = colors.alertErrorBg;
      break;
    default:
      break;
  }

  return { icon, type, bgColor };
};

const Banner: FC<ToastProps> = (props: ToastProps) => {
  const { top } = useSafeAreaInsets();
  const { icon, bgColor } = getDefaultBannerProps(props);
  return (
    <Box
      backgroundColor={bgColor}
      width="100%"
      py={40}
      pt={isIOS ? top + 40 : 40}
      px={20}
      mt={-top}
    >
      <Box
        flex={1}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        flexGrow={1}
      >
        <Box mr={14}>{icon}</Box>
        <Text>{props.message}</Text>
      </Box>
    </Box>
  );
};

const ToastProvider: FC<PropsWithChildren> = ({ children }) => {
  const { top } = useSafeAreaInsets();
  return (
    <RNTNToastProvider
      offsetBottom={20}
      offsetTop={isIOS ? top : -1}
      renderToast={({ ...props }) => {
        return props.data?.banner ? (
          <Banner {...props} />
        ) : (
          <Toast {...props} />
        );
      }}
    >
      {children}
    </RNTNToastProvider>
  );
};

export default ToastProvider;
