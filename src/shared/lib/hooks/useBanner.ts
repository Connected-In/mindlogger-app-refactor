import { ToastProps } from '@app/app/ui/AppProvider/ToastProvider';
import { useRef } from 'react';
import { useToast } from 'react-native-toast-notifications';
import type { ToastOptions } from 'react-native-toast-notifications/lib/typescript/toast';

type BannerType = 'info' | 'success' | 'error' | 'warning';

export const useBanner = () => {
  const toast = useToast();
  return {
    ...toast,
    show: (content: string | JSX.Element, options: ToastOptions) => {
      toast.hideAll();
      setTimeout(() => {
        toast.show(content, {
          placement: 'top',
          swipeEnabled: false,
          data: {
            banner: true,
          },
          ...options,
        });
      }, 200);
    },
  };
};

export default useBanner;
