'use client';

import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    appointment_date: string;
    doctor_name: string;
    appointment_type?: string;
  };
  onSuccess?: () => void;
}

export default function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(false);

  const originalDate = new Date(appointment.appointment_date);
  const now = new Date();
  const hoursUntilAppointment = (originalDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Calculate refund percentage
  let refundPercentage = 0;
  let refundMessage = '';
  let refundColor = '';

  if (hoursUntilAppointment > 24) {
    refundPercentage = 100;
    refundMessage = 'Full refund (100%)';
    refundColor = 'text-green-700 bg-green-50 border-green-500';
  } else if (hoursUntilAppointment > 4) {
    refundPercentage = 50;
    refundMessage = 'Partial refund (50%)';
    refundColor = 'text-yellow-700 bg-yellow-50 border-yellow-500';
  } else {
    refundPercentage = 0;
    refundMessage = 'No refund';
    refundColor = 'text-red-700 bg-red-50 border-red-500';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDate || !newTime) {
      toast.error('Please select both date and time');
      return;
    }

    const newDateTime = new Date(`${newDate}T${newTime}`);
    
    // Validate new date is in the future
    if (newDateTime <= now) {
      toast.error('Please select a future date and time');
      return;
    }

    // Validate new date is at least 2 hours from now
    const hoursFromNow = (newDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursFromNow < 2) {
      toast.error('Appointment must be at least 2 hours in the future');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newDateTime: newDateTime.toISOString() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Appointment rescheduled successfully!');
        if (data.refund.amount > 0) {
          toast.success(`Refund of $${data.refund.amount.toFixed(2)} will be processed within 5-7 days`, {
            duration: 5000,
          });
        }
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Reschedule error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-gray-900 mb-4"
                >
                  Reschedule Appointment
                </Dialog.Title>

                {/* Current Appointment Info */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Current Appointment</p>
                  <p className="text-sm text-gray-600">
                    <strong>Doctor:</strong> {appointment.doctor_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {appointment.appointment_type || 'Consultation'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Date:</strong> {originalDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Time:</strong> {originalDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Refund Policy Notice */}
                <div className={`mb-6 p-4 border-l-4 rounded ${refundColor}`}>
                  <p className="text-sm font-semibold mb-1">Refund Policy</p>
                  <p className="text-sm">{refundMessage}</p>
                  <p className="text-xs mt-2 opacity-80">
                    {refundPercentage === 100 && 'Rescheduling more than 24 hours in advance'}
                    {refundPercentage === 50 && 'Rescheduling between 4-24 hours in advance'}
                    {refundPercentage === 0 && 'Rescheduling less than 4 hours in advance'}
                  </p>
                </div>

                {/* New Date/Time Selection */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Date
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      min={minDateString}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Time
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Appointment must be at least 2 hours from now
                    </p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          You'll receive confirmation emails for both the cancellation and new appointment.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !newDate || !newTime}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Rescheduling...
                        </span>
                      ) : (
                        'Confirm Reschedule'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
