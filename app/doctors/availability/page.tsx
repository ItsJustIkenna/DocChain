'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

interface Schedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export default function AvailabilityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schedule, setSchedule] = useState<Schedule>({
    monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
    saturday: { enabled: false, slots: [] },
    sunday: { enabled: false, slots: [] },
  });
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'doctor') {
      router.push('/login');
      return;
    }
    
    fetchAvailability();
  }, [user, router, authLoading]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/doctors/availability');
      if (response.ok) {
        const data = await response.json();
        if (data.availability.schedule) {
          setSchedule(data.availability.schedule);
        }
        if (data.availability.blocked_dates) {
          setBlockedDates(data.availability.blocked_dates);
        }
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/doctors/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule, blocked_dates: blockedDates }),
      });

      if (response.ok) {
        setMessage('Availability saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save availability');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      setMessage('Error saving availability');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: keyof Schedule) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        enabled: !schedule[day].enabled,
      },
    });
  };

  const updateTimeSlot = (day: keyof Schedule, index: number, field: 'start' | 'end', value: string) => {
    const newSlots = [...schedule[day].slots];
    newSlots[index][field] = value;
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: newSlots,
      },
    });
  };

  const addTimeSlot = (day: keyof Schedule) => {
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: [...schedule[day].slots, { start: '09:00', end: '17:00' }],
      },
    });
  };

  const removeTimeSlot = (day: keyof Schedule, index: number) => {
    const newSlots = schedule[day].slots.filter((_, i) => i !== index);
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        slots: newSlots,
      },
    });
  };

  const days: { key: keyof Schedule; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <BackButton href="/doctors/dashboard" label="Back to Dashboard" />
          <AccountDropdown />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Availability</h1>
          <p className="text-lg text-gray-600">
            Set your working hours and block out unavailable times
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Weekly Schedule */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Weekly Schedule</h2>
          
          <div className="space-y-6">
            {days.map(({ key, label }) => (
              <div key={key} className="border-b border-gray-200 pb-6 last:border-b-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={schedule[key].enabled}
                      onChange={() => toggleDay(key)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="ml-3 text-lg font-semibold text-gray-900">
                      {label}
                    </label>
                  </div>
                  {schedule[key].enabled && (
                    <button
                      onClick={() => addTimeSlot(key)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Time Slot
                    </button>
                  )}
                </div>

                {schedule[key].enabled && (
                  <div className="ml-8 space-y-3">
                    {schedule[key].slots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                        {schedule[key].slots.length > 1 && (
                          <button
                            onClick={() => removeTimeSlot(key, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const workdaySchedule = { enabled: true, slots: [{ start: '09:00', end: '17:00' }] };
                setSchedule({
                  monday: workdaySchedule,
                  tuesday: workdaySchedule,
                  wednesday: workdaySchedule,
                  thursday: workdaySchedule,
                  friday: workdaySchedule,
                  saturday: { enabled: false, slots: [] },
                  sunday: { enabled: false, slots: [] },
                });
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              Set Weekday 9-5
            </button>
            <button
              onClick={() => {
                const allDaySchedule = { enabled: true, slots: [{ start: '09:00', end: '17:00' }] };
                setSchedule({
                  monday: allDaySchedule,
                  tuesday: allDaySchedule,
                  wednesday: allDaySchedule,
                  thursday: allDaySchedule,
                  friday: allDaySchedule,
                  saturday: allDaySchedule,
                  sunday: allDaySchedule,
                });
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
            >
              Set All Days 9-5
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
      </div>
    </div>
  );
}
