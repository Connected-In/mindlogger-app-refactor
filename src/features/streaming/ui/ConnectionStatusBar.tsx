import { FC, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useAppletStreamingStatus } from '@entities/applet/lib/hooks';
import { colors, useTCPSocket } from '@shared/lib';
import { XStack, Text, EditIcon, BoxProps } from '@shared/ui';

import { ConnectionModal } from './ConnectionModal';

type Props = {
  appletId: string;
} & BoxProps;

const ConnectionStatusBar: FC<Props> = ({ appletId, ...styleProps }) => {
  const { t } = useTranslation();
  const [isModalVisible, setModalVisible] = useState(false);
  const closeModal = () => setModalVisible(false);
  const streamEnabled = useAppletStreamingStatus(appletId);

  const { connected, getSocketInfo } = useTCPSocket();

  const { host, port } = getSocketInfo() ?? {};

  const onEdit = () => {
    setModalVisible(true);
  };

  if (!streamEnabled) {
    return null;
  }

  return (
    <>
      <XStack px={14} mt={8} {...styleProps}>
        <Text color="$black" fontWeight="bold" fontSize={17}>
          {t('live_connection:live_connection')}:
        </Text>

        <Text
          color={!connected ? '$tertiary' : '$green'}
          ml={10}
          mr={20}
          fontSize={17}
          accessibilityLabel="streaming-status-title"
        >
          {connected ? `${host} (${port})` : t('live_connection:not_available')}
        </Text>

        <TouchableOpacity
          accessibilityLabel="streaming-modal-open-btn"
          onPress={onEdit}
        >
          <EditIcon color={colors.black} size={22} />
        </TouchableOpacity>
      </XStack>

      <ConnectionModal visible={isModalVisible} onClose={closeModal} />
    </>
  );
};

export default ConnectionStatusBar;
