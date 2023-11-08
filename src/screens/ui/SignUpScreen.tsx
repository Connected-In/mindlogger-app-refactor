import { FC } from 'react';
import { Keyboard, TouchableWithoutFeedback, Linking } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { isTablet } from 'react-native-device-info';

import { SignUpForm } from '@features/sign-up';
import { StatusBar, Box, Text, KeyboardAvoidingView } from '@shared/ui';

const SignUpScreen: FC = () => {
  const { navigate } = useNavigation();
  const { t } = useTranslation();

  const navigateToTerms = () => {
    Linking.openURL('https://mindlogger.org/terms');
  };

  return (
    <KeyboardAvoidingView
      contentContainerStyle={{ flex: 1 }}
      flex={1}
      keyboardVerticalOffset={-120}
      behavior="position"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Box flex={1} bg="$primary">
          <StatusBar />

          <Box f={1} px={isTablet() ? 210 : '$7'}>
            <Box mt={isTablet() ? 170 : 52} mb={isTablet() ? 0 : 12}>
              <Text fontSize={36} color="$white" fontWeight="600">
                {t('login:account_create')}
              </Text>
            </Box>

            <Box mt={30}>
              <SignUpForm onLoginSuccess={() => navigate('Applets')} />
            </Box>

            <Box f={1} ai="center" jc="flex-end" mb={56}>
              <Box flexDirection={isTablet() ? 'row' : 'column'}>
                <Text
                  fontSize={16}
                  mr={isTablet() ? 4 : 0}
                  color="$white"
                  ta="center"
                >
                  {t('sign_up_form:sign_up_agree')}
                </Text>

                <Text
                  fontSize={16}
                  color="$white"
                  ta="center"
                  textDecorationLine="underline"
                  onPress={navigateToTerms}
                >
                  {t('auth:terms_of_service')}
                </Text>
              </Box>
            </Box>
          </Box>
        </Box>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;
