/**
 * Toast Notification Utilities
 * Centralized toast messages for consistent UX
 */

import toast from 'react-hot-toast';

// Success messages
export const toastSuccess = {
  appointmentBooked: () => toast.success('Appointment booked successfully! 🎉'),
  appointmentCancelled: () => toast.success('Appointment cancelled'),
  appointmentRescheduled: () => toast.success('Appointment rescheduled successfully'),
  profileUpdated: () => toast.success('Profile updated successfully'),
  paymentSuccess: () => toast.success('Payment processed successfully'),
  emailSent: () => toast.success('Email sent successfully'),
  saved: () => toast.success('Changes saved'),
};

// Error messages
export const toastError = {
  generic: () => toast.error('Something went wrong. Please try again.'),
  network: () => toast.error('Network error. Please check your connection.'),
  unauthorized: () => toast.error('You are not authorized to perform this action'),
  paymentFailed: () => toast.error('Payment failed. Please try again.'),
  invalidInput: () => toast.error('Please check your input and try again'),
  notFound: () => toast.error('Resource not found'),
  custom: (message: string) => toast.error(message),
};

// Loading messages
export const toastLoading = {
  processing: () => toast.loading('Processing...'),
  saving: () => toast.loading('Saving...'),
  loading: () => toast.loading('Loading...'),
  custom: (message: string) => toast.loading(message),
};

// Info/Warning messages
export const toastInfo = {
  custom: (message: string) => toast(message, { icon: 'ℹ️' }),
};

export const toastWarning = {
  custom: (message: string) => toast(message, { icon: '⚠️', duration: 5000 }),
};

// Async toast with promise
export async function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
): Promise<T> {
  return toast.promise(promise, messages);
}

// Dismiss all toasts
export function dismissAllToasts() {
  toast.dismiss();
}

export default toast;
