import { FC } from 'react';
import { AccessibilityProps, StyleSheet } from 'react-native';

import { CachedImage } from '@georstat/react-native-image-cache';

import { IS_IOS } from '@app/shared/lib';
import {
  RoundLogo,
  Box,
  RoundTextNotification,
  Text,
  XStack,
  YStack,
  TouchableOpacity,
} from '@app/shared/ui';

import { Applet } from '../lib';

type Props = {
  applet: Applet;
  disabled: boolean;
  onPress?: (...args: any[]) => void;
};

const AppletCard: FC<Props & AccessibilityProps> = ({
  applet,
  disabled,
  onPress,
  accessibilityLabel,
}) => {
  const theme = applet.theme;

  const renderThemeLogo = () => {
    if (theme?.logo) {
      return <CachedImage style={styles.smallLogo} source={theme.logo} />;
    }

    return null;
  };

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
    >
      <XStack
        position="relative"
        mx={3}
        p={12}
        borderWidth={3}
        borderColor="$lighterGrey"
        borderRadius={9}
        opacity={disabled ? 0.5 : 1}
        backgroundColor="$white"
      >
        <Box mr={14}>
          <RoundLogo
            accessibilityLabel={`applet-card-logo-${applet.id}`}
            imageUri={applet.image}
            letter={applet.displayName[0].toUpperCase()}
          />
        </Box>

        <YStack flexGrow={1} flexShrink={1}>
          <XStack jc="space-between">
            <Text
              mb={8}
              flex={1}
              fontWeight={IS_IOS ? '600' : '700'}
              fontSize={16}
              accessibilityLabel={`applet-name-${applet.id}`}
              lineHeight={20}
            >
              {applet.displayName}
            </Text>

            {renderThemeLogo()}
          </XStack>

          <Text
            accessibilityLabel={`applet-description-${applet.id}`}
            fontSize={14}
            fontWeight="300"
            lineHeight={20}
          >
            {applet.description}
          </Text>
        </YStack>

        {!!applet.numberOverdue && (
          <Box position="absolute" top={-14} right={-14}>
            <RoundTextNotification
              accessibilityLabel={`applet-number-overdue-${applet.id}`}
              text={applet.numberOverdue.toString()}
            />
          </Box>
        )}
      </XStack>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  smallLogo: {
    width: 60,
    height: 30,
    resizeMode: 'contain',
    marginTop: -5,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
    borderRadius: 32 / 2,
  },
});

export default AppletCard;
