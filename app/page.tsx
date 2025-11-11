'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function Home() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary-600 cursor-pointer">DocChain</h1>
              </Link>
            </div>
            <nav className="flex gap-6 items-center">
              <Link href="/doctors/browse" className="text-gray-700 hover:text-primary-600">
                Find Doctors
              </Link>
              {!user && (
                <Link href="/doctors/onboard" className="text-gray-700 hover:text-primary-600">
                  For Doctors
                </Link>
              )}
              <Link href="/dev/accounts" className="text-yellow-600 hover:text-yellow-700 font-medium">
                🔧 Dev
              </Link>
              
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <svg 
                      className={`w-4 h-4 text-gray-600 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-primary-600 font-medium mt-1 capitalize">{user.role}</p>
                      </div>
                      
                      <Link
                        href={user.role === 'doctor' ? '/doctors/dashboard' : '/dashboard'}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </Link>

                      <Link
                        href={user.role === 'doctor' ? '/doctors/profile' : '/profile'}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </Link>

                      <div className="border-t border-gray-200 mt-2 pt-2">
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            logout();
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-gray-700 hover:text-primary-600">
                    Sign In
                  </Link>
                  <Link href="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Affordable Healthcare
            <br />
            <span className="text-primary-600">Without Insurance</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            See a doctor from home for $30-150. No insurance required. 
            No hidden fees. Direct pay, instant booking.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
            >
              Get Started
            </Link>
            <Link
              href="/doctors/browse"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium border-2 border-primary-600 hover:bg-primary-50 transition"
            >
              Browse Doctors
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">72%</div>
            <div className="text-gray-700">Cheaper than traditional visits</div>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">$30-150</div>
            <div className="text-gray-700">Transparent pricing per visit</div>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="text-4xl font-bold text-primary-600 mb-2">5 min</div>
            <div className="text-gray-700">Average booking time</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h4 className="font-semibold mb-2">Browse Doctors</h4>
            <p className="text-gray-600 text-sm">
              Search by specialty and see pricing upfront
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h4 className="font-semibold mb-2">Book & Pay</h4>
            <p className="text-gray-600 text-sm">
              Pick a time slot and pay with your card
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h4 className="font-semibold mb-2">Video Consult</h4>
            <p className="text-gray-600 text-sm">
              Join from any device at your appointment time
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              4
            </div>
            <h4 className="font-semibold mb-2">Get Receipt</h4>
            <p className="text-gray-600 text-sm">
              Blockchain-verified proof for HSA/FSA claims
            </p>
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Popular Specialties</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {['Primary Care', 'Urgent Care', 'Mental Health', 'Dermatology', 
            'Pediatrics', 'Women\'s Health', 'Allergy', 'Nutrition'].map((specialty) => (
            <Link
              key={specialty}
              href={`/browse?specialty=${specialty}`}
              className="bg-white p-6 rounded-lg border-2 border-gray-200 hover:border-primary-600 hover:shadow-lg transition text-center font-medium"
            >
              {specialty}
            </Link>
          ))}
        </div>
      </section>

      {/* For Doctors CTA */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-3xl font-bold mb-4">Are You a Doctor?</h3>
          <p className="text-xl mb-8 opacity-90">
            Keep 88-92% of your earnings. Work on your schedule. Own your patient relationships.
          </p>
          <Link
            href="/doctors/onboard"
            className="bg-white text-primary-600 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition inline-block"
          >
            Start Earning Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-bold text-xl mb-4">DocChain</h4>
              <p className="text-gray-400 text-sm">
                Disrupting healthcare with blockchain-powered transparency.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Patients</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/browse">Find Doctors</Link></li>
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Doctors</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/doctors/onboard">Sign Up</Link></li>
                <li><Link href="/doctors/faq">FAQ</Link></li>
                <li><Link href="/doctors/pricing">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
                <li><Link href="/hipaa">HIPAA Compliance</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            © 2025 DocChain. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
