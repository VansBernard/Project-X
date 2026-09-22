/**
 * Modal Component
 */
import { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hideCancel?: boolean;
}

const sizeMap = {
  sm: 'w-96',
  md: 'w-full max-w-md',
  lg: 'w-full max-w-2xl',
  xl: 'w-full max-w-4xl',
};

export function Modal({
  isOpen,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  size = 'md',
  hideCancel = false,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3 sm:p-0">
      <div className={`no-scrollbar flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden bg-white shadow-xl dark:bg-gray-800 sm:rounded-lg ${sizeMap[size]}`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">{children}</div>

        {/* Footer */}
        {(!hideCancel || onConfirm) && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-4 dark:border-gray-700 sm:p-6">
            {!hideCancel && <Button variant="secondary" onClick={onClose}>{cancelText}</Button>}
            {onConfirm && (
              <Button
                variant={isDangerous ? 'danger' : 'primary'}
                onClick={onConfirm}
              >
                {confirmText}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
