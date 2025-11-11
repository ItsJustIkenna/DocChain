-- Sample doctors for testing
INSERT INTO doctors (
  email, 
  full_name, 
  specialty, 
  license_number, 
  license_state, 
  npi_number,
  is_verified,
  hourly_rate_usd,
  bio,
  years_experience
) VALUES 
(
  'dr.smith@example.com',
  'Dr. Sarah Smith',
  'Primary Care',
  'MD12345',
  'CA',
  '1234567890',
  true,
  6000, -- $60.00
  'Board-certified family medicine physician with 10 years of experience. Passionate about preventive care and patient education.',
  10
),
(
  'dr.jones@example.com',
  'Dr. Michael Jones',
  'Urgent Care',
  'MD23456',
  'TX',
  '2345678901',
  true,
  5000, -- $50.00
  'Emergency medicine specialist. Available for urgent consultations 7 days a week.',
  8
),
(
  'dr.patel@example.com',
  'Dr. Priya Patel',
  'Mental Health',
  'PSY34567',
  'NY',
  '3456789012',
  true,
  9000, -- $90.00
  'Licensed clinical psychologist specializing in anxiety, depression, and stress management.',
  12
),
(
  'dr.kim@example.com',
  'Dr. James Kim',
  'Dermatology',
  'MD45678',
  'FL',
  '4567890123',
  true,
  12000, -- $120.00
  'Board-certified dermatologist. Expert in skin conditions, acne treatment, and cosmetic dermatology.',
  15
),
(
  'dr.garcia@example.com',
  'Dr. Maria Garcia',
  'Pediatrics',
  'MD56789',
  'AZ',
  '5678901234',
  true,
  7000, -- $70.00
  'Pediatrician with a gentle approach. Specialized in childhood development and family health.',
  6
);

-- Add availability for all doctors (Mon-Fri 9am-5pm)
DO $$
DECLARE
  doc_id UUID;
  day INT;
BEGIN
  FOR doc_id IN SELECT id FROM doctors LOOP
    FOR day IN 1..5 LOOP -- Monday to Friday
      INSERT INTO availability_slots (doctor_id, day_of_week, start_time, end_time)
      VALUES (doc_id, day, '09:00:00', '17:00:00');
    END LOOP;
  END LOOP;
END $$;
