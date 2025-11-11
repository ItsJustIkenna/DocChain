# DocChain Feature Implementation Roadmap

**Status**: Comprehensive plan for implementing 25+ missing UI/UX features
**Created**: November 11, 2025
**Priority**: Organized by immediate impact and dependencies

---

## 🚨 Phase 1: Critical Features (Week 1) - DO IMMEDIATELY

### 1.1 Email Notifications System ⭐⭐⭐⭐⭐
**Priority**: CRITICAL | **Effort**: 8 hours | **Dependencies**: None

**What to build**:
- [ ] Complete `lib/email.ts` with SendGrid/Mailgun integration
- [ ] Appointment confirmation email template
- [ ] Appointment reminder email (24h and 1h before)
- [ ] Cancellation notification email
- [ ] Email verification template enhancement
- [ ] Doctor verification status email

**Implementation**:
```typescript
// lib/email.ts - Add email provider integration
export async function sendAppointmentConfirmation(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  appointmentTime: Date,
  appointmentId: string,
  blockchainTx?: string
) {
  const html = renderAppointmentConfirmationTemplate({
    patientName,
    doctorName,
    appointmentTime,
    appointmentUrl: `${process.env.NEXT_PUBLIC_APP_URL}/appointments/${appointmentId}`,
    blockchainUrl: blockchainTx ? `https://suiscan.xyz/devnet/tx/${blockchainTx}` : null,
  });
  
  await sendEmail({
    to: patientEmail,
    subject: `Appointment Confirmed with Dr. ${doctorName}`,
    html,
  });
}
```

**Files to modify**:
- `lib/email.ts` - Complete implementation
- `app/api/webhooks/stripe/route.ts` - Call email after payment
- `app/api/cron/send-reminders/route.ts` - Already exists, just needs real emails

**ENV variables needed**:
```bash
EMAIL_PROVIDER=sendgrid  # or 'mailgun' or 'console'
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@docchain.health
# OR
MAILGUN_API_KEY=your_key
MAILGUN_DOMAIN=mg.docchain.health
```

---

### 1.2 Password Reset & Change ⭐⭐⭐⭐⭐
**Priority**: CRITICAL | **Effort**: 6 hours | **Dependencies**: Email system

**What to build**:
- [ ] Forgot password page `/forgot-password`
- [ ] Reset password page `/reset-password`
- [ ] Change password in `/settings`
- [ ] Password reset email template
- [ ] Database table for reset tokens

**Database Migration**:
```sql
-- supabase/migrations/012_password_reset_tokens.sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
```

**API Routes to create**:
- `POST /api/auth/forgot-password` - Send reset email
- `POST /api/auth/reset-password` - Reset with token
- `PUT /api/auth/change-password` - Change when logged in

**Pages to create**:
- `app/forgot-password/page.tsx`
- `app/reset-password/page.tsx`

**Settings update**:
- Make "Change Password" button functional in `app/settings/page.tsx`

---

### 1.3 Appointment Rescheduling ⭐⭐⭐⭐
**Priority**: HIGH | **Effort**: 10 hours | **Dependencies**: Email system

**What to build**:
- [ ] Reschedule button on appointment cards
- [ ] Reschedule modal with new time selection
- [ ] Refund logic (100% if >24h, 50% if >4h, 0% if <4h)
- [ ] Email notifications for rescheduling
- [ ] Update blockchain record (optional)

**API Route**:
```typescript
// app/api/appointments/[id]/reschedule/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { newAppointmentTime } = await request.json();
  const appointmentId = params.id;
  
  // 1. Get current appointment
  // 2. Check if reschedule is allowed (>4h notice)
  // 3. Calculate refund if needed
  // 4. Update appointment time
  // 5. Process refund if applicable
  // 6. Send notification emails
  // 7. Update blockchain (optional)
}
```

**UI Component**:
```tsx
// components/RescheduleModal.tsx
export function RescheduleModal({ appointment, onClose, onSuccess }) {
  // Show calendar/time picker
  // Calculate and display refund policy
  // Submit reschedule request
}
```

---

### 1.4 Global Toast Notifications ⭐⭐⭐⭐
**Priority**: HIGH | **Effort**: 4 hours | **Dependencies**: None

**What to build**:
- [ ] Toast notification system (use react-hot-toast or build custom)
- [ ] Success, error, warning, info variants
- [ ] Integration throughout app

**Implementation**:
```bash
npm install react-hot-toast
```

```typescript
// app/ClientProviders.tsx
import { Toaster } from 'react-hot-toast';

export function ClientProviders({ children }: { children: React.Node }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
```

```typescript
// Usage throughout app
import toast from 'react-hot-toast';

toast.success('Appointment booked successfully!');
toast.error('Failed to cancel appointment');
toast.loading('Processing payment...');
```

---

### 1.5 Custom Confirmation Modals ⭐⭐⭐
**Priority**: MEDIUM-HIGH | **Effort**: 5 hours | **Dependencies**: None

**What to build**:
- [ ] Replace all `confirm()` calls with custom modal
- [ ] Reusable ConfirmDialog component
- [ ] Different variants (delete, cancel, etc.)

**Component**:
```tsx
// components/ConfirmDialog.tsx
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger' | 'warning' | 'info'
}) {
  // Modal with overlay
  // Styled based on variant
  // Keyboard shortcuts (Enter, Escape)
}
```

---

## 🔶 Phase 2: Important Features (Week 2-3)

### 2.1 Reviews & Ratings System ⭐⭐⭐⭐
**Priority**: HIGH | **Effort**: 12 hours

**Database Schema**:
```sql
-- supabase/migrations/013_reviews_ratings.sql
CREATE TABLE IF NOT EXISTS doctor_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    response_text TEXT, -- Doctor can respond
    responded_at TIMESTAMPTZ,
    is_verified BOOLEAN NOT NULL DEFAULT true, -- Only from actual appointments
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(appointment_id) -- One review per appointment
);

CREATE INDEX idx_doctor_reviews_doctor ON doctor_reviews(doctor_id);
CREATE INDEX idx_doctor_reviews_rating ON doctor_reviews(rating);

-- Add to doctors table
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
```

**Features**:
- [ ] Review form on completed appointments
- [ ] Display reviews on doctor profile
- [ ] Sort doctors by rating
- [ ] Doctor can respond to reviews
- [ ] Calculate and display average rating

---

### 2.2 Search Enhancements ⭐⭐⭐⭐
**Priority**: HIGH | **Effort**: 8 hours

**What to add to `/doctors/browse`**:
- [ ] Sort dropdown (Price, Experience, Rating, Name)
- [ ] Pagination (show 12 per page)
- [ ] Advanced filters sidebar:
  - Price range slider
  - Years of experience filter
  - Available today/this week
  - Language spoken (future)
- [ ] Save favorite doctors (requires DB table)
- [ ] Recent searches

**Component Structure**:
```tsx
// app/doctors/browse/page.tsx updates
<div className="grid grid-cols-4 gap-6">
  {/* Left Sidebar - Filters */}
  <div className="col-span-1">
    <FilterSidebar 
      filters={filters}
      onFilterChange={setFilters}
    />
  </div>
  
  {/* Main Content */}
  <div className="col-span-3">
    <SearchBar />
    <SortDropdown />
    <DoctorGrid doctors={paginatedDoctors} />
    <Pagination 
      currentPage={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  </div>
</div>
```

---

### 2.3 Doctor Availability Calendar ⭐⭐⭐⭐
**Priority**: HIGH | **Effort**: 16 hours

**Database Schema**:
```sql
-- supabase/migrations/014_doctor_availability.sql
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun, 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS doctor_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);
CREATE INDEX idx_time_off_doctor ON doctor_time_off(doctor_id);
```

**Features**:
- [ ] Doctor sets weekly schedule (Mon-Sun, time slots)
- [ ] Doctor can block out vacation days
- [ ] Visual calendar view for doctors `/doctors/calendar`
- [ ] Patient sees available times when booking
- [ ] Buffer time between appointments (configurable)

**Libraries to use**:
```bash
npm install react-big-calendar date-fns
# or
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid
```

---

### 2.4 Medical History Forms ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 10 hours

**Database Schema**:
```sql
-- supabase/migrations/015_medical_history.sql
CREATE TABLE IF NOT EXISTS patient_medical_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Demographics
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    blood_type TEXT,
    
    -- Medical History
    allergies JSONB, -- ["Penicillin", "Peanuts"]
    current_medications JSONB, -- [{"name": "Aspirin", "dosage": "81mg", "frequency": "daily"}]
    chronic_conditions JSONB, -- ["Diabetes Type 2", "Hypertension"]
    past_surgeries JSONB, -- [{"name": "Appendectomy", "date": "2020-01-15"}]
    family_history JSONB, -- {"cancer": true, "heart_disease": true, "diabetes": false}
    
    -- Lifestyle
    smoking_status TEXT CHECK (smoking_status IN ('never', 'former', 'current')),
    alcohol_use TEXT CHECK (alcohol_use IN ('none', 'occasional', 'moderate', 'heavy')),
    exercise_frequency TEXT,
    
    -- Emergency Contact
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    
    -- Metadata
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(patient_id)
);
```

**Features**:
- [ ] Onboarding flow for new patients
- [ ] Update medical history in profile
- [ ] Pre-appointment questionnaire
- [ ] Doctor sees medical history before appointment

---

### 2.5 File Upload System ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 12 hours

**What to build**:
- [ ] S3/Supabase Storage integration
- [ ] File upload component (drag & drop)
- [ ] File preview (images, PDFs)
- [ ] File download with presigned URLs
- [ ] HIPAA-compliant encryption at rest

**Implementation**:
```bash
# Using Supabase Storage (recommended)
# Already included in @supabase/supabase-js
```

```typescript
// lib/storage.ts
export async function uploadMedicalFile(
  file: File,
  patientId: string,
  recordId: string
): Promise<string> {
  const fileName = `${patientId}/${recordId}/${Date.now()}_${file.name}`;
  
  const { data, error } = await supabaseAdmin.storage
    .from('medical-records')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
    
  if (error) throw error;
  
  return data.path;
}

export async function getFileUrl(path: string): Promise<string> {
  const { data } = await supabaseAdmin.storage
    .from('medical-records')
    .createSignedUrl(path, 3600); // 1 hour expiry
    
  return data.signedUrl;
}
```

**UI Component**:
```tsx
// components/FileUpload.tsx
export function FileUpload({ onUpload, accept = "image/*,application/pdf" }) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Drag and drop handlers
  // File input
  // Progress bar
  // File preview
}
```

---

## 📱 Phase 3: UX Polish (Week 4)

### 3.1 Loading States & Skeletons ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 6 hours

**What to build**:
- [ ] Skeleton screens for dashboards
- [ ] Consistent loading spinners
- [ ] Loading states for buttons
- [ ] Optimistic UI updates

**Component Library**:
```tsx
// components/ui/Skeleton.tsx
export function Skeleton({ width, height, className }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function DoctorCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-4">
        <Skeleton width="64px" height="64px" className="rounded-full" />
        <div className="ml-4 flex-1">
          <Skeleton width="60%" height="24px" className="mb-2" />
          <Skeleton width="40%" height="16px" />
        </div>
      </div>
      <Skeleton width="100%" height="60px" />
    </div>
  );
}
```

---

### 3.2 Error Boundaries ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 4 hours

**Implementation**:
```tsx
// components/ErrorBoundary.tsx
'use client';

import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Send to error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Oops!</h1>
            <p className="text-gray-600 mb-6">Something went wrong.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap app in `app/layout.tsx`:
```tsx
<ErrorBoundary>
  <ClientProviders>
    {children}
  </ClientProviders>
</ErrorBoundary>
```

---

### 3.3 Notification Preferences ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 6 hours

**Database Schema**:
```sql
-- supabase/migrations/016_notification_preferences.sql
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Email preferences
    email_appointment_confirmations BOOLEAN NOT NULL DEFAULT true,
    email_appointment_reminders BOOLEAN NOT NULL DEFAULT true,
    email_appointment_updates BOOLEAN NOT NULL DEFAULT true,
    email_marketing BOOLEAN NOT NULL DEFAULT false,
    
    -- SMS preferences (future)
    sms_appointment_reminders BOOLEAN NOT NULL DEFAULT false,
    sms_appointment_updates BOOLEAN NOT NULL DEFAULT false,
    
    -- Push preferences (future)
    push_notifications BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);
```

**Implementation**:
- [ ] Make settings checkboxes functional
- [ ] Save to database
- [ ] Check preferences before sending emails
- [ ] API route to update preferences

---

### 3.4 Data Export ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 8 hours

**Features**:
- [ ] Export all patient data as JSON
- [ ] Export medical records as PDF
- [ ] Export appointment history as CSV
- [ ] HIPAA compliance (audit log export)

**API Route**:
```typescript
// app/api/patients/export/route.ts
export async function GET(request: NextRequest) {
  // 1. Get all patient data
  // 2. Get all appointments
  // 3. Get all medical records
  // 4. Generate PDF or JSON
  // 5. Return as download
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="docchain-data-${Date.now()}.json"`,
    },
  });
}
```

---

## 🏢 Phase 4: Admin Features (Week 5)

### 4.1 Admin Dashboard ⭐⭐⭐
**Priority**: MEDIUM | **Effort**: 20 hours

**What to build**:
- [ ] Metrics dashboard (users, appointments, revenue)
- [ ] User management (search, ban, suspend)
- [ ] Doctor verification queue
- [ ] Financial reports
- [ ] Audit log viewer
- [ ] Platform settings

**Pages to create**:
- `app/admin/dashboard/page.tsx`
- `app/admin/users/page.tsx`
- `app/admin/doctors/verify/page.tsx` (enhance existing)
- `app/admin/financials/page.tsx`
- `app/admin/audit-logs/page.tsx`
- `app/admin/settings/page.tsx`

---

### 4.2 Two-Factor Authentication ⭐⭐
**Priority**: LOW-MEDIUM | **Effort**: 12 hours

**What to build**:
- [ ] TOTP setup with QR code
- [ ] Backup codes generation
- [ ] SMS 2FA (Twilio)
- [ ] Remember device option

**Library**:
```bash
npm install speakeasy qrcode
```

---

## 🎨 Phase 5: Polish & Optimization (Ongoing)

### 5.1 Mobile Responsiveness
- [ ] Test all pages on mobile devices
- [ ] Fix video call page for mobile
- [ ] Improve calendar/date picker UX
- [ ] Touch-friendly interactions

### 5.2 Accessibility (A11y)
- [ ] Add aria-labels to all interactive elements
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Color contrast fixes
- [ ] Focus indicators

### 5.3 SEO & Meta Tags
- [ ] Dynamic page titles
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Structured data for doctors
- [ ] Sitemap generation

### 5.4 Analytics
```bash
npm install @vercel/analytics
# or
npm install react-ga4
```

### 5.5 Error Monitoring
```bash
npm install @sentry/nextjs
```

---

## 📊 Estimated Timeline

| Phase | Duration | Features |
|-------|----------|----------|
| **Phase 1** | 1 week | Email, Password, Rescheduling, Toasts, Modals (5 features) |
| **Phase 2** | 2 weeks | Reviews, Search, Calendar, Medical History, File Upload (5 features) |
| **Phase 3** | 1 week | Loading States, Error Boundaries, Notifications, Export (4 features) |
| **Phase 4** | 1 week | Admin Dashboard, 2FA (2 features) |
| **Phase 5** | Ongoing | Mobile, A11y, SEO, Analytics, Monitoring (5 areas) |

**Total**: ~5-6 weeks for full implementation

---

## 🚀 Quick Start Implementation Order

If you want to start NOW, implement in this exact order:

1. **Toast Notifications** (4h) - Foundation for UX feedback
2. **Email System** (8h) - Critical for user communication
3. **Password Reset** (6h) - Depends on email
4. **Custom Modals** (5h) - Replace browser confirms
5. **Rescheduling** (10h) - High user demand
6. **Reviews** (12h) - Trust building
7. **Search Enhancements** (8h) - Discovery improvement
8. **Calendar** (16h) - Doctor workflow
9. **Medical History** (10h) - Patient onboarding
10. **File Upload** (12h) - Medical records

---

## 📝 Notes

- All features should include tests (Jest + Playwright)
- Database migrations should be reversible
- Email templates should be responsive
- All forms need proper validation
- Consider rate limiting on all new endpoints
- Add Sentry for error tracking before going to production
- HIPAA compliance review required before launch
- Security audit recommended for Phase 4+

---

## 🔗 Resources

- [SendGrid Docs](https://docs.sendgrid.com/)
- [Mailgun Docs](https://documentation.mailgun.com/)
- [React Hot Toast](https://react-hot-toast.com/)
- [FullCalendar](https://fullcalendar.io/docs/react)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
