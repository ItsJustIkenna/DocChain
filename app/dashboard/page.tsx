'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';
import RescheduleModal from '@/components/RescheduleModal';

interface Appointment {
  id: string;
  appointment_time: string;
  duration_minutes: number;
  status: string;
  price_usd: number;
  twilio_room_sid: string | null;
  notes?: string | null;
  sui_transaction_digest?: string | null;
  doctor: {
    id: string;
    title_prefix: string | null;
    full_name: string;
    specialty: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [patientWalletAddress, setPatientWalletAddress] = useState<string | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{
    isOpen: boolean;
    appointment: {
      id: string;
      appointment_date: string;
      doctor_name: string;
      appointment_type?: string;
    } | null;
  }>({
    isOpen: false,
    appointment: null,
  });

  // Use regular function declarations instead of arrow functions
  async function fetchPatientWallet() {
    try {
      const response = await fetch(`/api/patients/wallet?patientId=${user?.userId}`);
      if (response.ok) {
        const data = await response.json();
        setPatientWalletAddress(data.suiAddress);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  }

  async function fetchAppointments() {
    try {
      const response = await fetch('/api/appointments');
      if (!response.ok) throw new Error('Failed to fetch appointments');
      
      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(appointmentId: string) {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        // Refresh appointments
        fetchAppointments();
      } else {
        alert('Failed to cancel appointment');
      }
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      alert('Error cancelling appointment');
    }
  }

  useEffect(() => {
    fetchAppointments();
    if (user) {
      // Verify user is a patient
      if (user.role !== 'patient') {
        router.push('/doctors/dashboard');
        return;
      }
      fetchPatientWallet();
    }
  }, [user]);

  const getFilteredAppointments = () => {
    const now = new Date();
    return appointments.filter((apt) => {
      const aptTime = new Date(apt.appointment_time);
      
      switch (filter) {
        case 'upcoming':
          return aptTime > now && apt.status !== 'cancelled';
        case 'past':
          return aptTime <= now && apt.status !== 'cancelled';
        case 'cancelled':
          return apt.status === 'cancelled';
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canJoinVideo = (appointment: Appointment) => {
    const aptTime = new Date(appointment.appointment_time);
    const now = new Date();
    const fifteenMinsBefore = new Date(aptTime.getTime() - 15 * 60000);
    const aptEnd = new Date(aptTime.getTime() + appointment.duration_minutes * 60000);
    
    return (
      appointment.status === 'confirmed' &&
      appointment.twilio_room_sid &&
      now >= fifteenMinsBefore &&
      now <= aptEnd
    );
  };

  const filteredAppointments = getFilteredAppointments();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not a patient
  if (!user || user.role !== 'patient') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <BackButton href="/" label="Back to Home" />
        
        {/* Header */}
        <div className="mb-8 flex justify-between items-center mt-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {user ? `Welcome, ${user.fullName}` : 'My Dashboard'}
            </h1>
            <p className="text-lg text-gray-600">Manage your appointments and consultations</p>
          </div>
          <AccountDropdown />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => router.push('/doctors/browse')}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Book Appointment</h3>
                <p className="text-sm text-gray-600">Find a doctor</p>
              </div>
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/medical-records')}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Medical Records</h3>
                <p className="text-sm text-gray-600">View your history</p>
              </div>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => router.push('/payments')}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment History</h3>
                <p className="text-sm text-gray-600">View transactions</p>
              </div>
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </button>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Upcoming</h3>
                <p className="text-3xl font-bold text-green-600">
                  {appointments.filter(a => new Date(a.appointment_time) > new Date() && a.status !== 'cancelled').length}
                </p>
              </div>
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Blockchain Wallet Info */}
        {patientWalletAddress && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-xl font-bold">Your Blockchain Wallet</h3>
                </div>
                <p className="text-sm text-blue-100 mb-3">
                  Sui Blockchain • Custodial Wallet
                </p>
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <p className="text-xs font-medium text-blue-100 mb-1">Wallet Address</p>
                  <p className="text-sm font-mono break-all">{patientWalletAddress}</p>
                </div>
              </div>
              <a
                href={`https://suiexplorer.com/address/${patientWalletAddress}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition text-sm font-medium backdrop-blur-sm"
              >
                View on Explorer →
              </a>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['all', 'upcoming', 'past', 'cancelled'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`py-4 px-6 text-sm font-medium capitalize transition-colors duration-200 border-b-2 ${
                    filter === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Appointments List */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600 mb-6">
                  {filter === 'all' 
                    ? "You haven't booked any appointments yet."
                    : `No ${filter} appointments.`}
                </p>
                <button
                  onClick={() => router.push('/doctors/browse')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  Book Your First Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => {
                  const aptDate = new Date(appointment.appointment_time);
                  const isUpcoming = aptDate > new Date() && appointment.status !== 'cancelled';
                  
                  return (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 mb-4 md:mb-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {appointment.doctor.title_prefix ? `${appointment.doctor.title_prefix} ` : ''}
                              {appointment.doctor.full_name}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{appointment.doctor.specialty}</p>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {aptDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {aptDate.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })}
                            </div>
                            
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {appointment.duration_minutes} min
                            </div>
                            
                            <div className="flex items-center font-semibold text-gray-900">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              ${(appointment.price_usd / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {canJoinVideo(appointment) && (
                            <button
                              onClick={() => router.push(`/video/${appointment.id}`)}
                              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                            >
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Join Video Call
                            </button>
                          )}
                          
                          <button
                            onClick={() => router.push(`/appointments/${appointment.id}`)}
                            className="bg-white text-blue-600 py-2 px-6 rounded-lg font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-all duration-200"
                          >
                            View Details
                          </button>

                          {isUpcoming && appointment.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => setRescheduleModal({
                                  isOpen: true,
                                  appointment: {
                                    id: appointment.id,
                                    appointment_date: appointment.appointment_time,
                                    doctor_name: appointment.doctor.full_name,
                                    appointment_type: 'Consultation',
                                  },
                                })}
                                className="bg-white text-purple-600 py-2 px-6 rounded-lg font-semibold border-2 border-purple-600 hover:bg-purple-50 transition-all duration-200"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => cancelAppointment(appointment.id)}
                                className="bg-white text-red-600 py-2 px-6 rounded-lg font-semibold border-2 border-red-600 hover:bg-red-50 transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Doctor's Notes (for completed appointments) */}
                      {appointment.status === 'completed' && appointment.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">Doctor's Notes</h4>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Blockchain Transaction Link */}
                      {appointment.sui_transaction_digest && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-start gap-2">
                            <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                <span>Blockchain Verified</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  Immutable
                                </span>
                              </h4>
                              <p className="text-xs text-gray-600 mb-2">
                                This appointment has been permanently recorded on the Sui blockchain
                              </p>
                              <div className="bg-gray-50 rounded-md p-2 mb-2">
                                <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                                <code className="text-xs text-purple-600 break-all font-mono">
                                  {appointment.sui_transaction_digest}
                                </code>
                              </div>
                              <a
                                href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet'}/tx/${appointment.sui_transaction_digest}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium"
                              >
                                <span>View on Sui Explorer</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Modal */}
        {rescheduleModal.appointment && (
          <RescheduleModal
            isOpen={rescheduleModal.isOpen}
            onClose={() => setRescheduleModal({ isOpen: false, appointment: null })}
            appointment={rescheduleModal.appointment}
            onSuccess={() => {
              fetchAppointments();
              setRescheduleModal({ isOpen: false, appointment: null });
            }}
          />
        )}
      </div>
    </div>
  );
}
