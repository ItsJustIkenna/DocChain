'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

export default function DoctorOnboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    title_prefix: '',
    full_name: '',
    specialty: '',
    license_number: '',
    license_state: '',
    npi_number: '',
    hourly_rate_usd: '',
    bio: '',
    years_experience: '',
  });

  const specialties = [
    'Primary Care',
    'Internal Medicine',
    'Pediatrics',
    'Cardiology',
    'Dermatology',
    'Psychiatry',
    'Orthopedics',
    'General Surgery',
    'Neurology',
    'Endocrinology',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert hourly rate from dollars to cents
      const hourlyRateCents = Math.round(parseFloat(formData.hourly_rate_usd) * 100);

      const response = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hourly_rate_usd: hourlyRateCents,
          years_experience: formData.years_experience ? parseInt(formData.years_experience) : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', data);
        throw new Error(data.error || data.details?.message || 'Failed to register');
      }

      // Show success and redirect
      alert('Registration successful! You will receive verification confirmation within 24-48 hours.');
      router.push('/');
    } catch (err: any) {
      console.error('Form error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <BackButton href="/" label="Back to Home" />
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Join DocChain</h1>
            <p className="text-lg text-gray-600">
              Start seeing patients virtually and earn 88-92% of every appointment
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="title_prefix" className="block text-sm font-medium text-gray-700 mb-1">
                    Title Prefix
                  </label>
                  <select
                    id="title_prefix"
                    name="title_prefix"
                    value={formData.title_prefix}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select...</option>
                    <option value="Dr.">Dr.</option>
                    <option value="MD">MD</option>
                    <option value="DO">DO</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    required
                    value={formData.full_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Sarah Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="doctor@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    id="years_experience"
                    name="years_experience"
                    min="0"
                    value={formData.years_experience}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio (Optional)
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Tell patients about yourself..."
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
                    Specialty *
                  </label>
                  <select
                    id="specialty"
                    name="specialty"
                    required
                    value={formData.specialty}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="" className="text-gray-500">Select specialty</option>
                    {specialties.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience (Optional)
                  </label>
                  <input
                    type="number"
                    id="years_experience"
                    name="years_experience"
                    min="0"
                    value={formData.years_experience}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="10"
                  />
                </div>

                <div>
                  <label htmlFor="npi_number" className="block text-sm font-medium text-gray-700 mb-1">
                    NPI Number *
                  </label>
                  <input
                    type="text"
                    id="npi_number"
                    name="npi_number"
                    required
                    pattern="[0-9]{10}"
                    value={formData.npi_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="1234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">10-digit National Provider Identifier</p>
                </div>

                <div>
                  <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    id="license_number"
                    name="license_number"
                    required
                    value={formData.license_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="MD123456"
                  />
                </div>

                <div>
                  <label htmlFor="license_state" className="block text-sm font-medium text-gray-700 mb-1">
                    License State *
                  </label>
                  <input
                    type="text"
                    id="license_state"
                    name="license_state"
                    required
                    maxLength={2}
                    value={formData.license_state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="CA"
                  />
                  <p className="text-xs text-gray-500 mt-1">2-letter state code</p>
                </div>

                <div>
                  <label htmlFor="hourly_rate_usd" className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate (USD) *
                  </label>
                  <input
                    type="number"
                    id="hourly_rate_usd"
                    name="hourly_rate_usd"
                    required
                    min="50"
                    max="500"
                    step="0.01"
                    value={formData.hourly_rate_usd}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="150.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: $120-$200/hour</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• We'll verify your NPI number with NPPES (usually instant)</li>
                <li>• You'll receive a Stripe Connect onboarding link via email</li>
                <li>• Once verified, you can start accepting appointments</li>
                <li>• Payouts arrive T+2 days after each appointment</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
