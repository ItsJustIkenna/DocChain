'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ClaimableAppointment {
  id: string;
  appointment_time: string;
  duration_minutes: number;
  price_usd: number;
  sui_transaction_digest: string;
  doctor: {
    full_name: string;
    specialty: string;
    title_prefix: string;
  };
}

interface ClaimAppointmentsProps {
  patientId: string;
  walletConnected: boolean;
}

export default function ClaimAppointments({ patientId, walletConnected }: ClaimAppointmentsProps) {
  const [appointments, setAppointments] = useState<ClaimableAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResults, setClaimResults] = useState<any>(null);

  useEffect(() => {
    if (walletConnected) {
      fetchClaimableAppointments();
    }
  }, [patientId, walletConnected]);

  const fetchClaimableAppointments = async () => {
    try {
      const response = await fetch(`/api/patients/claim-appointments?patientId=${patientId}`);
      const data = await response.json();
      
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Error fetching claimable appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const claimAllAppointments = async () => {
    setClaiming(true);
    setClaimResults(null);

    try {
      const response = await fetch('/api/patients/claim-appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
        }),
      });

      const results = await response.json();
      setClaimResults(results);

      if (results.claimed > 0) {
        // Refresh the list
        fetchClaimableAppointments();
      }
    } catch (err) {
      console.error('Error claiming appointments:', err);
      setClaimResults({
        error: err instanceof Error ? err.message : 'Failed to claim appointments',
      });
    } finally {
      setClaiming(false);
    }
  };

  if (!walletConnected) {
    return (
      <div className="bg-gray-50 rounded-lg shadow p-6 text-center">
        <div className="text-4xl mb-3">👛</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Connect Your Wallet First
        </h3>
        <p className="text-sm text-gray-600">
          Please connect your Sui wallet above to view and claim your appointments.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-4xl mb-3">✨</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No Appointments to Claim
        </h3>
        <p className="text-sm text-gray-600">
          You don't have any past appointments to claim yet. Once you book appointments, 
          they'll appear here for you to claim as blockchain NFTs.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">📋</span>
          Claimable Appointments
        </h3>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {appointments.length} Available
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        These appointments are ready to be claimed as NFTs in your wallet. 
        This gives you permanent, verifiable ownership of your medical appointment history.
      </p>

      {claimResults && (
        <div className={`rounded-lg p-4 mb-4 ${claimResults.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          {claimResults.error ? (
            <p className="text-sm text-red-600">{claimResults.error}</p>
          ) : (
            <div>
              <p className="text-sm font-medium text-green-800 mb-1">
                ✓ Successfully claimed {claimResults.claimed} of {claimResults.total} appointments!
              </p>
              {claimResults.results && (
                <div className="mt-2 space-y-1">
                  {claimResults.results.map((result: any, idx: number) => (
                    <div key={idx} className="text-xs text-green-700">
                      {result.success ? (
                        <a 
                          href={`https://suiscan.xyz/devnet/tx/${result.transactionDigest}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          ✓ View on Sui Explorer →
                        </a>
                      ) : (
                        <span className="text-red-600">✗ {result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3 mb-6">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-gray-800">
                  {appointment.doctor.title_prefix} {appointment.doctor.full_name}
                </p>
                <p className="text-sm text-gray-600">{appointment.doctor.specialty}</p>
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                ${(appointment.price_usd / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <span>{format(new Date(appointment.appointment_time), 'PPP')}</span>
                <span className="mx-2">•</span>
                <span>{appointment.duration_minutes} min</span>
              </div>
              <a
                href={`https://suiscan.xyz/devnet/tx/${appointment.sui_transaction_digest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline"
              >
                View TX →
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={claimAllAppointments}
        disabled={claiming}
        className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center"
      >
        {claiming ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Claiming to Wallet...
          </>
        ) : (
          `Claim All ${appointments.length} Appointments`
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-3">
        This will create blockchain transactions and may take a few moments.
      </p>
    </div>
  );
}
