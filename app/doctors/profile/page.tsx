'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import AccountDropdown from '@/components/AccountDropdown';

interface DoctorProfile {
  id: string;
  email: string;
  title_prefix: string;
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

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [formData, setFormData] = useState({
    title_prefix: 'Dr.',
    full_name: '',
    specialty: '',
    license_number: '',
    license_state: '',
    npi_number: '',
    years_experience: '',
    hourly_rate_usd: '',
    bio: '',
  });

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      router.push('/login');
      return;
    }

    fetchProfile();
  }, [user, router]);

  async function fetchProfile() {
    try {
      const response = await fetch('/api/doctors/profile');
      if (!response.ok) throw new Error('Failed to fetch profile');
      
      const data = await response.json();
      setProfile(data.doctor);
      
      // If profile is incomplete (new doctor), go to edit mode
      if (!data.doctor.full_name) {
        setIsEditing(true);
      }
      
      setFormData({
        title_prefix: data.doctor.title_prefix || 'Dr.',
        full_name: data.doctor.full_name || '',
        specialty: data.doctor.specialty || '',
        license_number: data.doctor.license_number || '',
        license_state: data.doctor.license_state || '',
        npi_number: data.doctor.npi_number || '',
        years_experience: data.doctor.years_experience?.toString() || '',
        hourly_rate_usd: data.doctor.hourly_rate_usd ? (data.doctor.hourly_rate_usd / 100).toString() : '',
        bio: data.doctor.bio || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/doctors/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }

      await fetchProfile();
      setSuccess('Profile updated successfully! Pending verification.');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <BackButton href="/doctors/dashboard" label="Back to Dashboard" />
          <AccountDropdown />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isEditing ? 'Edit Profile' : 'My Profile'}
              </h1>
              <p className="text-gray-600">
                {isEditing 
                  ? 'Update your professional information' 
                  : 'View your professional information'}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Verification Status Badge */}
          <div className="mb-6">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              profile.is_verified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {profile.is_verified ? '✓ Verified' : '⏳ Pending Verification'}
            </span>
          </div>

          {isEditing ? (
            /* EDIT MODE */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <select
                    required
                    value={formData.title_prefix}
                    onChange={(e) => setFormData({ ...formData, title_prefix: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Dr.">Dr.</option>
                    <option value="Prof.">Prof.</option>
                    <option value="MD">MD</option>
                    <option value="DO">DO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Sarah Smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specialty *
                </label>
                <select
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a specialty...</option>
                  <option value="Primary Care">Primary Care</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="Mental Health">Mental Health</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Urgent Care">Urgent Care</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Family Medicine">Family Medicine</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="MD-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License State *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={formData.license_state}
                    onChange={(e) => setFormData({ ...formData, license_state: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="CA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NPI Number *
                </label>
                <input
                  type="text"
                  required
                  pattern="[0-9]{10}"
                  value={formData.npi_number}
                  onChange={(e) => setFormData({ ...formData, npi_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1234567890 (10 digits)"
                />
                <p className="text-xs text-gray-500 mt-1">National Provider Identifier (10 digits)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="60"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate (USD) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.hourly_rate_usd}
                    onChange={(e) => setFormData({ ...formData, hourly_rate_usd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your hourly rate in dollars</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Bio *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Board-certified physician with expertise in..."
                />
                <p className="text-xs text-gray-500 mt-1">This will be visible to patients</p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {profile.full_name && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        title_prefix: profile.title_prefix || 'Dr.',
                        full_name: profile.full_name || '',
                        specialty: profile.specialty || '',
                        license_number: profile.license_number || '',
                        license_state: profile.license_state || '',
                        npi_number: profile.npi_number || '',
                        years_experience: profile.years_experience?.toString() || '',
                        hourly_rate_usd: profile.hourly_rate_usd ? (profile.hourly_rate_usd / 100).toString() : '',
                        bio: profile.bio || '',
                      });
                      setError('');
                    }}
                    className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* VIEW MODE */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Name & Title
                  </label>
                  <p className="text-lg text-gray-900">
                    {profile.title_prefix} {profile.full_name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Email
                  </label>
                  <p className="text-lg text-gray-900">{profile.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Specialty
                  </label>
                  <p className="text-lg text-gray-900">{profile.specialty || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Years of Experience
                  </label>
                  <p className="text-lg text-gray-900">{profile.years_experience || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    License Number
                  </label>
                  <p className="text-lg text-gray-900">{profile.license_number || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    License State
                  </label>
                  <p className="text-lg text-gray-900">{profile.license_state || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    NPI Number
                  </label>
                  <p className="text-lg text-gray-900">{profile.npi_number || 'Not set'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Hourly Rate
                  </label>
                  <p className="text-lg text-gray-900">
                    ${profile.hourly_rate_usd ? (profile.hourly_rate_usd / 100).toFixed(2) : '0.00'}/hr
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Professional Bio
                </label>
                <p className="text-gray-900 whitespace-pre-wrap">{profile.bio || 'Not set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Account Created
                </label>
                <p className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          )}

          {!profile.is_verified && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">⏳ Verification Pending</h3>
              <p className="text-sm text-gray-700">
                Your profile is currently under review. Once verified by our team, you'll be able to accept appointments from patients.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
