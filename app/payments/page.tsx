'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';

interface Payment {
  id: string;
  appointment_id: string;
  appointment_time: string;
  doctor_name: string;
  doctor_specialty: string;
  amount_usd: number;
  stripe_payment_intent_id: string;
  sui_transaction_hash: string | null;
  status: string;
  created_at: string;
}

export default function PaymentHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'patient') {
      router.push('/login');
      return;
    }
    
    fetchPaymentHistory();
  }, [user, router, authLoading]);

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch('/api/appointments');
      if (response.ok) {
        const data = await response.json();
        // Transform appointments into payment records
        const paymentRecords = data.appointments
          .filter((apt: any) => apt.status !== 'pending' && apt.status !== 'cancelled')
          .map((apt: any) => ({
            id: apt.id,
            appointment_id: apt.id,
            appointment_time: apt.appointment_time,
            doctor_name: apt.doctor?.full_name || 'Unknown Doctor',
            doctor_specialty: apt.doctor?.specialty || 'General',
            amount_usd: apt.price_usd,
            stripe_payment_intent_id: apt.stripe_payment_intent_id,
            sui_transaction_hash: apt.sui_transaction_hash,
            status: apt.status,
            created_at: apt.created_at,
          }));
        
        setPayments(paymentRecords);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = payments.reduce((sum, p) => sum + p.amount_usd, 0);
  const completedPayments = payments.filter(p => p.status === 'completed').length;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <BackButton href="/dashboard" label="Back to Dashboard" />
          <AccountDropdown />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment History</h1>
          <p className="text-lg text-gray-600">
            View all your appointment payments and blockchain transactions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Spent</p>
                <p className="text-3xl font-bold text-gray-900">
                  ${(totalSpent / 100).toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
                <p className="text-3xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{completedPayments}</p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
              <p className="text-gray-600 mb-6">
                Your payment transactions will appear here once you complete appointments.
              </p>
              <Link
                href="/doctors/browse"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Book an Appointment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {payment.doctor_name}
                      </h3>
                      <p className="text-sm text-gray-600">{payment.doctor_specialty}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(payment.appointment_time).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ${(payment.amount_usd / 100).toFixed(2)}
                      </p>
                      <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>

                  {/* Transaction IDs */}
                  <div className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 mb-1">Stripe Payment ID</p>
                        <p className="text-xs text-gray-900 font-mono break-all">
                          {payment.stripe_payment_intent_id || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {payment.sui_transaction_hash && (
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                        <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-600 mb-1">Blockchain Transaction</p>
                          <a
                            href={`https://suiexplorer.com/txblock/${payment.sui_transaction_hash}?network=testnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-mono break-all underline"
                          >
                            {payment.sui_transaction_hash}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    <Link
                      href={`/appointments/${payment.appointment_id}`}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Appointment →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
