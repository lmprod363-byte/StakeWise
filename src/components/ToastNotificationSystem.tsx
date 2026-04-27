import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Toast } from './ui/Toast';

interface NotificationSystemProps {
  successToast: {
    message: string;
    type: 'success' | 'info' | 'loss';
  } | null;
}

export function ToastNotificationSystem({ successToast }: NotificationSystemProps) {
  return (
    <AnimatePresence>
      {successToast && (
        <Toast
          message={successToast.message}
          type={successToast.type}
        />
      )}
    </AnimatePresence>
  );
}
