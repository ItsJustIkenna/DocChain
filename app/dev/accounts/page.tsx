'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface Doctor {
  id: string;
  email: string;
  full_name: string;
  npi_number: string;
  specialty: string;
  is_verified: boolean;
}

interface Patient {
  id: string;
  email: string;
  full_name: string;
}

export default function DevAccountsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const [doctorsRes, patientsRes] = await Promise.all([
        fetch('/api/dev/doctors'),
        fetch('/api/dev/patients'),
      ]);

      const doctorsData = await doctorsRes.json();
      const patientsData = await patientsRes.json();

      setDoctors(doctorsData.doctors || []);
      setPatients(patientsData.patients || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    alert(`Copied: ${email}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <BackButton href="/" label="Back to Home" />
        
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-8">
          <div className="flex items-start">
            <div className="text-3xl mr-4">⚠️</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Development Test Accounts</h1>
              <p className="text-gray-700 mb-2">
                <strong>This page is only available in development mode.</strong>
              </p>
              <div className="bg-white border border-yellow-600 rounded-lg px-4 py-3 my-3 inline-block">
                <p className="text-gray-900">
                  <strong>All test accounts use password:</strong>{' '}
                  <code className="bg-gray-100 px-3 py-1 rounded font-mono text-lg">test123</code>
                </p>
              </div>
              <p className="text-gray-600 text-sm">
                Click "Login" button to auto-fill email, then enter password <code>test123</code>
              </p>
            </div>
          </div>
        </div>

        {/* Doctors Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">🩺</span>
            Doctor Accounts ({doctors.length})
          </h2>

          {doctors.length === 0 ? (
            <p className="text-gray-600">No doctor accounts found.</p>
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{doctor.full_name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">{doctor.email}</code>
                          <button
                            onClick={() => copyEmail(doctor.email)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                        <div><span className="font-medium">NPI:</span> {doctor.npi_number}</div>
                        <div><span className="font-medium">Specialty:</span> {doctor.specialty}</div>
                        <div>
                          <span className="font-medium">Status:</span>{' '}
                          <span className={doctor.is_verified ? 'text-green-600' : 'text-yellow-600'}>
                            {doctor.is_verified ? '✓ Verified' : '⚠ Pending Verification'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/login?email=${encodeURIComponent(doctor.email)}`}
                      className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Login as Doctor
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patients Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">👤</span>
            Patient Accounts ({patients.length})
          </h2>

          {patients.length === 0 ? (
            <p className="text-gray-600">No patient accounts found.</p>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{patient.full_name}</h3>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded">{patient.email}</code>
                          <button
                            onClick={() => copyEmail(patient.email)}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/login?email=${encodeURIComponent(patient.email)}`}
                      className="ml-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Login as Patient
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Quick Login Instructions</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Click "Login" button to go to login page with email pre-filled</li>
            <li>Enter password: <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">test123</code></li>
            <li>You'll be redirected to the appropriate dashboard</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-blue-300">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> Run <code className="bg-gray-100 px-2 py-0.5 rounded">seed-data.sql</code> in Supabase to populate 5 doctors and 5 patients with consistent credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
