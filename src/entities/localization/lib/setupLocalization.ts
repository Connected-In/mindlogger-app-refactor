import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod';
import { zodI18nMap } from 'zod-i18n-map';

import en from '@assets/translations/en.json';
import fr from '@assets/translations/fr.json';
import ko from '@assets/translations/ko.json';

import LocalizationStorage from './LocalizationStorage';

declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}

z.setErrorMap(zodI18nMap);

function setupLocalization() {
  const language = LocalizationStorage.getLanguage() ?? 'ko';

  return i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    lng: language,
    fallbackLng: 'ko',
    resources: {
      en,
      fr,
      ko,
    },
    returnNull: false,
  });

  // @todo - automatically detect language of the device
}

export default setupLocalization;
