'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Doctor {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  license_number: string;
  license_state: string;
  npi_number: string;
  years_experience: number;
  hourly_rate_usd: number;
  bio: string;
  is_verified: boolean;
  created_at: string;
}

export default function AdminVerifyDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      console.log('Fetching doctors from API...');
      // Add cache busting to force fresh data
      const response = await fetch(`/api/admin/doctors?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched doctors:', data.doctors?.length, 'doctors');
        console.log('Doctor verification states:', data.doctors?.map((d: any) => ({ 
          name: d.full_name, 
          verified: d.is_verified 
        })));
        // Create completely new array to force React update
        const newDoctors = [...(data.doctors || [])];
        setDoctors(newDoctors);
        console.log('Set doctors state with', newDoctors.length, 'doctors');
      } else {
        console.error('Failed to fetch doctors:', response.status);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  const handleVerify = async (doctorId: string, approve: boolean) => {
    try {
      console.log('Verifying doctor:', doctorId, approve);
      const response = await fetch('/api/admin/verify-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, approve }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        alert(data.message || 'Doctor verification updated');
        // Force re-fetch with new data
        console.log('Refreshing doctor list...');
        await fetchDoctors();
        // Force re-render
        setRefreshKey(prev => prev + 1);
        console.log('Doctors state after refresh:', doctors.length, 'doctors');
      } else {
        alert(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error verifying doctor:', error);
      alert(`An error occurred: ${error}`);
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    if (filter === 'pending') return !doctor.is_verified;
    if (filter === 'verified') return doctor.is_verified;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin: Verify Doctors</h1>
              <p className="text-gray-600">Review and approve doctor profiles</p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Back to Home
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({doctors.filter((d) => !d.is_verified).length})
            </button>
            <button
              onClick={() => setFilter('verified')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'verified'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Verified ({doctors.filter((d) => d.is_verified).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({doctors.length})
            </button>
          </div>
        </div>

        {/* Doctors List */}
        {filteredDoctors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center" key={`empty-${refreshKey}`}>
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors found</h3>
            <p className="text-gray-600">
              {filter === 'pending' && 'No doctors awaiting verification.'}
              {filter === 'verified' && 'No verified doctors yet.'}
              {filter === 'all' && 'No doctors registered yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6" key={`list-${refreshKey}`}>
            {filteredDoctors.map((doctor) => (
              <div
                key={doctor.id}
                className={`bg-white rounded-xl shadow-lg p-6 ${
                  !doctor.is_verified ? 'border-2 border-yellow-300' : 'border-2 border-green-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">{doctor.full_name}</h2>
                      {doctor.is_verified ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{doctor.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      ${(doctor.hourly_rate_usd / 100).toFixed(2)}/hr
                    </p>
                    <p className="text-sm text-gray-500">
                      {doctor.years_experience} years exp.
                    </p>
                  </div>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm font-medium text-gray-900 break-all">{doctor.email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">License</p>
                    <p className="text-sm font-medium text-gray-900">
                      {doctor.license_number} ({doctor.license_state})
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">NPI Number</p>
                    <p className="text-sm font-medium text-gray-900">{doctor.npi_number}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Registered</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(doctor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Bio */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2">Professional Bio</p>
                  <p className="text-sm text-gray-700">{doctor.bio}</p>
                </div>

                {/* Action Buttons */}
                {!doctor.is_verified ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(doctor.id, true)}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                      ✓ Approve & Verify
                    </button>
                    <button
                      onClick={() => handleVerify(doctor.id, false)}
                      className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition"
                    >
                      ✗ Reject
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerify(doctor.id, false)}
                      className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 transition"
                    >
                      Revoke Verification
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Admin Instructions</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            <li>Review doctor credentials (license, NPI, experience)</li>
            <li>Verify license numbers with state medical boards if needed</li>
            <li>Approve verified doctors to make them visible to patients</li>
            <li>Reject profiles with invalid or suspicious information</li>
            <li>Revoke verification if issues are discovered later</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
