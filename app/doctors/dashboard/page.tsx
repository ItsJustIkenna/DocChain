'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  price_usd: number;
  twilio_room_sid: string | null;
  notes?: string | null;
  patient: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface DoctorProfile {
  id: string;
  full_name: string;
  specialty: string;
  is_verified: boolean;
  hourly_rate_usd: number;
  bio: string;
}

export default function DoctorDashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>('');

  useEffect(() => {
    // Wait for auth to load before checking user
    if (authLoading) return;
    
    if (!user || user.role !== 'doctor') {
      router.push('/login');
      return;
    }
    
    fetchDashboardData();
  }, [user, router, authLoading]);

  useEffect(() => {
    console.log('Profile state changed:', profile);
    console.log('Profile is_verified:', profile?.is_verified);
  }, [profile]);

  const fetchDashboardData = async () => {
    try {
      // Fetch doctor profile with cache busting
      const profileRes = await fetch(`/api/doctors/profile?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        console.log('Doctor profile loaded:', data.doctor);
        console.log('Profile is_verified:', data.doctor?.is_verified);
        console.log('Profile exists:', !!data.doctor);
        setProfile(data.doctor);
        
        // Fetch doctor's appointments if we have the doctor ID
        if (data.doctor?.id) {
          const appointmentsRes = await fetch(`/api/appointments?doctor_id=${data.doctor.id}`);
          if (appointmentsRes.ok) {
            const appointmentsData = await appointmentsRes.json();
            setAppointments(appointmentsData.appointments || []);
            console.log('Doctor appointments loaded:', appointmentsData.appointments?.length);
          }
        }
      } else {
        console.error('Failed to fetch profile:', profileRes.status);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Refresh appointments
        fetchDashboardData();
      } else {
        alert('Failed to update appointment');
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Error updating appointment');
    }
  };

  const saveNotes = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText }),
      });

      if (response.ok) {
        setEditingNotes(null);
        setNotesText('');
        // Refresh appointments
        fetchDashboardData();
      } else {
        alert('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes');
    }
  };

  const startEditingNotes = (appointmentId: string, currentNotes: string | null | undefined) => {
    setEditingNotes(appointmentId);
    setNotesText(currentNotes || '');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackButton href="/" label="Back to Home" />
          <div className="flex justify-between items-center mt-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.fullName || user?.email}</p>
            </div>
            <AccountDropdown />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/doctors/calendar"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Calendar View</h3>
                <p className="text-sm text-gray-600">See appointments in calendar format</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/doctors/availability"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Manage Availability</h3>
                <p className="text-sm text-gray-600">Set your working hours and schedule</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </Link>

          <Link
            href="/doctors/profile"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Update Profile</h3>
                <p className="text-sm text-gray-600">Edit your professional information</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appointments.filter(a => a.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(appointments.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.price_usd, 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Earnings Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Completed Earnings</p>
              <p className="text-3xl font-bold text-green-600">
                ${(appointments.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.price_usd, 0) / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {appointments.filter(a => a.status === 'completed').length} completed appointments
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Confirmed (Upcoming)</p>
              <p className="text-3xl font-bold text-blue-600">
                ${(appointments.filter(a => a.status === 'confirmed').reduce((sum, a) => sum + a.price_usd, 0) / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {appointments.filter(a => a.status === 'confirmed').length} confirmed appointments
              </p>
            </div>

            <div className="border-l-4 border-yellow-500 pl-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
              <p className="text-3xl font-bold text-yellow-600">
                ${(appointments.filter(a => a.status === 'pending').reduce((sum, a) => sum + a.price_usd, 0) / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {appointments.filter(a => a.status === 'pending').length} pending approval
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold text-gray-900">Total Revenue (All Time)</p>
                <p className="text-sm text-gray-600">Sum of all appointments</p>
              </div>
              <p className="text-4xl font-bold text-gray-900">
                ${(appointments.reduce((sum, a) => sum + a.price_usd, 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Appointments</h2>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Appointments Yet</h3>
              <p className="text-gray-600 mb-6">
                {profile?.is_verified 
                  ? 'Your upcoming appointments will appear here once patients book with you.'
                  : 'Complete and verify your profile to start accepting appointments.'}
              </p>
              {!profile?.is_verified && (
                <Link
                  href="/doctors/profile"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Complete Your Profile
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{appointment.patient?.full_name || 'Unknown Patient'}</h3>
                      <p className="text-sm text-gray-500">{appointment.patient?.email}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {new Date(appointment.appointment_time).toLocaleString()} • {appointment.duration_minutes} minutes
                      </p>
                      <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">${(appointment.price_usd / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium text-sm"
                        >
                          ✗ Reject
                        </button>
                      </>
                    )}
                    
                    {appointment.status === 'confirmed' && (
                      <>
                        {appointment.twilio_room_sid && (
                          <Link
                            href={`/video/${appointment.id}`}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm text-center"
                          >
                            📹 Join Video Call
                          </Link>
                        )}
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium text-sm"
                        >
                          ✓ Mark Complete
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {appointment.status === 'completed' && (
                      <div className="flex-1 text-center text-sm text-gray-500">
                        Appointment completed
                      </div>
                    )}

                    {appointment.status === 'cancelled' && (
                      <div className="flex-1 text-center text-sm text-red-500">
                        Appointment cancelled
                      </div>
                    )}
                  </div>

                  {/* Consultation Notes */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Consultation Notes</h4>
                      {!editingNotes || editingNotes !== appointment.id ? (
                        <button
                          onClick={() => startEditingNotes(appointment.id, appointment.notes)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {appointment.notes ? 'Edit Notes' : 'Add Notes'}
                        </button>
                      ) : null}
                    </div>
                    
                    {editingNotes === appointment.id ? (
                      <div>
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add consultation notes, diagnosis, prescriptions, follow-up instructions..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                          rows={4}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => saveNotes(appointment.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                          >
                            Save Notes
                          </button>
                          <button
                            onClick={() => {
                              setEditingNotes(null);
                              setNotesText('');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {appointment.notes || 'No notes added yet'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile Completeness */}
        {profile ? (
          profile.is_verified ? (
            // Verified profile - green banner
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-green-900">Profile Verified ✓</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your profile is active and patients can now book appointments with you at ${(profile.hourly_rate_usd / 100).toFixed(2)}/hour.
                  </p>
                  <div className="mt-2 text-sm text-green-800">
                    <strong>{profile.full_name}</strong> • {profile.specialty}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Pending verification - yellow banner
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-medium text-yellow-900">Profile Pending Verification</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Your profile has been submitted and is awaiting admin verification. You'll be able to accept appointments once verified.
                  </p>
                  <Link
                    href="/doctors/profile"
                    className="mt-3 inline-block bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                  >
                    Edit Profile →
                  </Link>
                </div>
              </div>
            </div>
          )
        ) : (
          // No profile - blue banner
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-blue-900">Complete Your Profile</h3>
                <p className="mt-1 text-sm text-blue-700">
                  To start accepting appointments, complete your profile with license information and specialty.
                </p>
                <Link
                  href="/doctors/profile"
                  className="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Complete Profile →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
