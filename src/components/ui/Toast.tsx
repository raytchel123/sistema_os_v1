import { toast, Toaster } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Custom toast functions with icons and styling
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)',
      },
      icon: <CheckCircle className="w-5 h-5" />,
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.25)',
      },
      icon: <XCircle className="w-5 h-5" />,
    });
  },

  warning: (message: string) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#F59E0B',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.25)',
      },
      icon: <AlertTriangle className="w-5 h-5" />,
    });
  },

  info: (message: string) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#3B82F6',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.25)',
      },
      icon: <Info className="w-5 h-5" />,
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
      style: {
        background: '#6B7280',
        color: '#fff',
        padding: '16px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '500',
      },
    });
  },

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};

// Toast container component
export function ToastContainer() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{}}
      toastOptions={{
        className: '',
        duration: 4000,
        style: {
          background: '#fff',
          color: '#374151',
        },
      }}
    />
  );
}