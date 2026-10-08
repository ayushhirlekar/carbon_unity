import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import mr from './locales/mr.json';
import hi from './locales/hi.json';

/**
 * Interface translation.
 *
 * Scope is deliberate: the FARMER surface is translated, admin and
 * buyer screens stay English. A smallholder in Sangli may read
 * only Marathi; an aggregator operating the platform and a
 * corporate credit buyer do not have that constraint, and
 * translating their screens would be maintenance with no reader.
 *
 * This translates the INTERFACE only. Advisory prose is written by
 * the narrator in the farmer's language, and numbers are produced
 * by the reasoning engine before any translation happens — which
 * is why a Marathi answer and an English one always carry
 * identical figures.
 */

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    mr: { translation: mr },
    hi: { translation: hi },
  },
  lng: localStorage.getItem('lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },   // React already escapes
  returnEmptyString: false,                // fall back rather than render blank
});

export const setLanguage = (lng) => {
  localStorage.setItem('lang', lng);
  i18n.changeLanguage(lng);
};

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
];

export default i18n;
