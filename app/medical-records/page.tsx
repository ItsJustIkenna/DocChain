'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';

interface MedicalRecord {
  id: string;
  record_type: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
  appointment_id?: string | null;
  sui_transaction_hash?: string | null;
  doctor: {
    id: string;
    full_name: string;
    specialty: string;
  };
}

export default function MedicalRecordsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recent' | 'by-doctor'>('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'patient') {
      router.push('/login');
      return;
    }
    
    fetchMedicalRecords();
  }, [user, router, authLoading]);

  const fetchMedicalRecords = async () => {
    try {
      const response = await fetch('/api/medical-records');
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error fetching medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRecords = () => {
    let filtered = [...records];

    switch (filter) {
      case 'recent':
        filtered = filtered.filter(r => {
          const date = new Date(r.created_at);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return date >= monthAgo;
        });
        break;
      case 'by-doctor':
        // Group by doctor (just sort for now)
        filtered.sort((a, b) => a.doctor.full_name.localeCompare(b.doctor.full_name));
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredRecords = getFilteredRecords();

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading medical records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <AccountDropdown />
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Medical Records</h1>
            <p className="text-lg text-gray-600">
              View your consultation notes and medical history
            </p>
          </div>
          <button
            onClick={() => router.push('/medical-records/access')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Manage Access</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Records</p>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Recent (30 days)</p>
                <p className="text-3xl font-bold text-gray-900">
                  {records.filter(r => {
                    const date = new Date(r.created_at);
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return date >= monthAgo;
                  }).length}
                </p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Doctors Consulted</p>
                <p className="text-3xl font-bold text-gray-900">
                  {new Set(records.map(r => r.doctor.id)).size}
                </p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['all', 'recent', 'by-doctor'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`py-4 px-6 text-sm font-medium capitalize transition-colors duration-200 border-b-2 ${
                    filter === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'by-doctor' ? 'By Doctor' : tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Records List */}
          <div className="p-6">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Records</h3>
                <p className="text-gray-600 mb-6">
                  Your consultation notes and medical records will appear here.
                </p>
                <Link
                  href="/doctors/browse"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Book an Appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition cursor-pointer"
                    onClick={() => setSelectedRecord(selectedRecord?.id === record.id ? null : record)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {record.doctor.full_name}
                          </h3>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {record.record_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{record.doctor.specialty}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div>
                        <svg
                          className={`w-6 h-6 text-gray-400 transition-transform ${
                            selectedRecord?.id === record.id ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {selectedRecord?.id === record.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Consultation Notes</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.description}</p>
                        </div>

                        {/* Blockchain Transaction Link */}
                        {record.sui_transaction_hash ? (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="text-sm font-semibold text-gray-900">Blockchain Verified</h5>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    Immutable
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">
                                  This medical record has been permanently secured on the Sui blockchain
                                </p>
                                <div className="bg-white rounded-md p-2 mb-2">
                                  <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                                  <code className="text-xs text-purple-600 break-all font-mono">
                                    {record.sui_transaction_hash}
                                  </code>
                                </div>
                                <a
                                  href={`https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet'}/tx/${record.sui_transaction_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-xs text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  <span>View on Sui Explorer</span>
                                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 text-xs text-blue-800">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              <span className="font-medium">Secured & Encrypted</span>
                              <span className="text-gray-600">• Tamper-proof • HIPAA Compliant</span>
                            </div>
                          </div>
                        )}

                        {/* Link to Appointment */}
                        {record.appointment_id && (
                          <div className="mt-3">
                            <Link
                              href={`/appointments/${record.appointment_id}`}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                            >
                              <span>View Related Appointment</span>
                              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-1">Your Data, Your Control</h3>
              <p className="text-sm text-blue-800">
                All medical records are encrypted and stored securely. You control who can access your medical information.
                Records are verified on the blockchain to prevent tampering.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
