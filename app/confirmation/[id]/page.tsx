'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  appointment_time: string;
  duration_minutes: number;
  price_usd: number;
  status: string;
  sui_transaction_digest?: string;
  video_room_id?: string;
  doctor: {
    full_name: string;
    specialty: string;
    title_prefix: string;
  };
}

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) return;

    const fetchAppointment = async () => {
      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);
        
        if (!response.ok) {
          throw new Error('Appointment not found');
        }

        const data = await response.json();
        setAppointment(data.appointment);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appointment');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Appointment Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const appointmentDate = new Date(appointment.appointment_time);
  const blockchainTxHash = appointment.sui_transaction_digest;
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet';
  const explorerUrl = blockchainTxHash 
    ? `https://suiscan.xyz/${network}/tx/${blockchainTxHash}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Appointment Confirmed!
          </h1>
          <p className="text-gray-600">
            Your appointment has been successfully booked and recorded on the blockchain.
          </p>
        </div>

        {/* Appointment Details */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Appointment Details</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Doctor:</span>
              <span className="font-semibold text-gray-800">
                {appointment.doctor.title_prefix} {appointment.doctor.full_name}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Specialty:</span>
              <span className="font-semibold text-gray-800">
                {appointment.doctor.specialty}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-semibold text-gray-800">
                {format(appointmentDate, 'PPP')}
                <br />
                {format(appointmentDate, 'p')}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-semibold text-gray-800">
                {appointment.duration_minutes} minutes
              </span>
            </div>
            
            <div className="flex justify-between border-t pt-3 mt-3">
              <span className="text-gray-600">Total Paid:</span>
              <span className="font-bold text-green-600 text-lg">
                ${(appointment.price_usd / 100).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Blockchain Verification */}
        {blockchainTxHash ? (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">🔗</span>
              Blockchain Verified
            </h2>
            <p className="text-gray-600 text-sm mb-3">
              This appointment has been permanently recorded on the Sui blockchain, ensuring 
              transparency and immutability of your medical records.
            </p>
            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
              <code className="text-xs text-purple-600 break-all font-mono">
                {blockchainTxHash}
              </code>
            </div>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
              >
                View on Sui Explorer →
              </a>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
              <span className="text-2xl mr-2">✓</span>
              Appointment Confirmed
            </h2>
            <p className="text-gray-600 text-sm mb-2">
              Your appointment has been successfully confirmed and paid.
            </p>
            <p className="text-gray-500 text-xs">
              Note: Blockchain recording requires doctor registration on Sui network.
            </p>
          </div>
        )}

        {/* Next Steps */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What's Next?</h2>
          <ul className="space-y-2 text-gray-600 mb-6">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>You'll receive a confirmation email with appointment details</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>Join the video consultation 5 minutes before your scheduled time</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>You can view and manage your appointments in your dashboard</span>
            </li>
          </ul>

          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-center font-medium"
            >
              Go to Dashboard
            </Link>
            {appointment.video_room_id && (
              <Link
                href={`/video/${appointment.id}`}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 text-center font-medium"
              >
                Join Video Call
              </Link>
            )}
          </div>
        </div>

        {/* Appointment ID */}
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-gray-500">
            Appointment ID: <code className="text-gray-700 font-mono">{appointment.id}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
