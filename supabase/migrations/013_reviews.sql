-- Migration: Reviews and Ratings System
-- Description: Allow patients to review doctors after completed appointments
-- Created: 2024

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  response TEXT, -- Doctor's response to the review
  responded_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT true, -- Verified as legitimate appointment
  is_flagged BOOLEAN DEFAULT false, -- Flagged for moderation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_review_per_appointment UNIQUE (appointment_id),
  CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);

-- Create indexes for performance
CREATE INDEX idx_reviews_doctor_id ON reviews(doctor_id);
CREATE INDEX idx_reviews_patient_id ON reviews(patient_id);
CREATE INDEX idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX idx_reviews_verified ON reviews(is_verified) WHERE is_verified = true;

-- Create helpful votes table for review helpfulness
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_vote_per_user UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);

-- Add review statistics columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00 CHECK (average_rating >= 0 AND average_rating <= 5),
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
ADD COLUMN IF NOT EXISTS five_star_count INTEGER DEFAULT 0 CHECK (five_star_count >= 0),
ADD COLUMN IF NOT EXISTS four_star_count INTEGER DEFAULT 0 CHECK (four_star_count >= 0),
ADD COLUMN IF NOT EXISTS three_star_count INTEGER DEFAULT 0 CHECK (three_star_count >= 0),
ADD COLUMN IF NOT EXISTS two_star_count INTEGER DEFAULT 0 CHECK (two_star_count >= 0),
ADD COLUMN IF NOT EXISTS one_star_count INTEGER DEFAULT 0 CHECK (one_star_count >= 0);

-- Function to update doctor's review statistics
CREATE OR REPLACE FUNCTION update_doctor_review_stats(doctor_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0.00)
      FROM reviews
      WHERE doctor_id = doctor_uuid AND is_verified = true
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE doctor_id = doctor_uuid AND is_verified = true
    ),
    five_star_count = (
      SELECT COUNT(*) FROM reviews WHERE doctor_id = doctor_uuid AND rating = 5 AND is_verified = true
    ),
    four_star_count = (
      SELECT COUNT(*) FROM reviews WHERE doctor_id = doctor_uuid AND rating = 4 AND is_verified = true
    ),
    three_star_count = (
      SELECT COUNT(*) FROM reviews WHERE doctor_id = doctor_uuid AND rating = 3 AND is_verified = true
    ),
    two_star_count = (
      SELECT COUNT(*) FROM reviews WHERE doctor_id = doctor_uuid AND rating = 2 AND is_verified = true
    ),
    one_star_count = (
      SELECT COUNT(*) FROM reviews WHERE doctor_id = doctor_uuid AND rating = 1 AND is_verified = true
    )
  WHERE id = doctor_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update review stats when review is inserted/updated/deleted
CREATE OR REPLACE FUNCTION trigger_update_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_doctor_review_stats(OLD.doctor_id);
    RETURN OLD;
  ELSE
    PERFORM update_doctor_review_stats(NEW.doctor_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION trigger_update_review_stats();

-- Comments
COMMENT ON TABLE reviews IS 'Patient reviews and ratings for doctors';
COMMENT ON COLUMN reviews.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN reviews.is_verified IS 'Verified that patient had actual appointment';
COMMENT ON COLUMN reviews.is_flagged IS 'Flagged by moderators for review';
COMMENT ON COLUMN reviews.response IS 'Doctor response to patient review';

COMMENT ON TABLE review_votes IS 'Helpful votes for reviews';
COMMENT ON COLUMN review_votes.is_helpful IS 'True if helpful, false if not helpful';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON review_votes TO authenticated;

-- RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can view verified reviews"
  ON reviews FOR SELECT
  USING (is_verified = true);

CREATE POLICY "Patients can insert reviews for their appointments"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = patient_id AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_id
        AND appointments.patient_id = auth.uid()
        AND appointments.status = 'completed'
    )
  );

CREATE POLICY "Review authors can update their reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can respond to their reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Review votes policies
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote on reviews"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON review_votes FOR DELETE
  USING (auth.uid() = user_id);
