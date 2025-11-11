'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AccountDropdown from '@/components/AccountDropdown';

interface AccessGrant {
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  doctor_image: string | null;
  can_read: boolean;
  can_write: boolean;
  granted_at: string;
  expires_at: string | null;
}

export default function MedicalRecordsAccessPage() {
  const router = useRouter();
  const [accessGrants, setAccessGrants] = useState<AccessGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchAccessGrants();
  }, []);

  const fetchAccessGrants = async () => {
    try {
      const response = await fetch('/api/medical-records/access');
      if (!response.ok) {
        throw new Error('Failed to fetch access grants');
      }
      const data = await response.json();
      setAccessGrants(data.access_grants || []);
    } catch (error) {
      console.error('Error fetching access grants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (doctorId: string, doctorName: string) => {
    if (!confirm(`Are you sure you want to revoke access for Dr. ${doctorName}?\n\nThey will no longer be able to view or add to your medical records.`)) {
      return;
    }

    setRevoking(doctorId);
    try {
      const response = await fetch(`/api/medical-records/access?doctor_id=${doctorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      const data = await response.json();
      alert(data.message || 'Access revoked successfully');
      
      // Remove from local state
      setAccessGrants(prev => prev.filter(grant => grant.doctor_id !== doctorId));
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Failed to revoke access. Please try again.');
    } finally {
      setRevoking(null);
    }
  };

  const handleGrantAccess = () => {
    // Navigate to browse doctors page to select a doctor
    router.push('/doctors/browse?action=grant-access');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading access grants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/medical-records')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
                <p className="text-sm text-gray-600">Manage who can view your medical records</p>
              </div>
            </div>
            <AccountDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Your Privacy, Your Control</h3>
              <p className="text-sm text-blue-800">
                You have complete control over who can access your medical records. Doctors you've consulted are granted access by default, but you can revoke it at any time. All access changes are recorded on the blockchain for security and transparency.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Doctors</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{accessGrants.length}</p>
              </div>
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Read Access</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {accessGrants.filter(g => g.can_read).length}
                </p>
              </div>
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Write Access</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {accessGrants.filter(g => g.can_write).length}
                </p>
              </div>
              <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Access Grants List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Authorized Healthcare Providers</h2>
            <button
              onClick={handleGrantAccess}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              + Grant New Access
            </button>
          </div>

          {accessGrants.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Access Grants Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't granted access to any doctors yet. Complete an appointment to automatically grant access, or manually grant access to a specific doctor.
              </p>
              <button
                onClick={handleGrantAccess}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Browse Doctors
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {accessGrants.map((grant) => (
                <div key={grant.doctor_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Doctor Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                        {grant.doctor_image ? (
                          <img
                            src={grant.doctor_image}
                            alt={grant.doctor_name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          grant.doctor_name.split(' ').map(n => n[0]).join('').toUpperCase()
                        )}
                      </div>

                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">{grant.doctor_name}</h3>
                        <p className="text-sm text-gray-600">{grant.doctor_specialty}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Access granted {new Date(grant.granted_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Permissions */}
                      <div className="hidden md:flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            grant.can_read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {grant.can_read ? '✓ Can Read' : '✗ No Read'}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            grant.can_write ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {grant.can_write ? '✓ Can Write' : '✗ No Write'}
                          </div>
                        </div>

                        {grant.expires_at && (
                          <div className="text-xs text-orange-600 font-medium">
                            Expires {new Date(grant.expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleRevokeAccess(grant.doctor_id, grant.doctor_name)}
                        disabled={revoking === grant.doctor_id}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {revoking === grant.doctor_id ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Revoking...
                          </span>
                        ) : (
                          'Revoke Access'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mobile Permissions */}
                  <div className="md:hidden mt-3 flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      grant.can_read ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {grant.can_read ? '✓ Read' : '✗ Read'}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      grant.can_write ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {grant.can_write ? '✓ Write' : '✗ Write'}
                    </div>
                    {grant.expires_at && (
                      <div className="text-xs text-orange-600 font-medium">
                        Expires {new Date(grant.expires_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blockchain Security Note */}
        {accessGrants.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-gray-700">
                All access grants and revocations are recorded on the Sui blockchain, ensuring an immutable audit trail of who has accessed your medical records and when.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
