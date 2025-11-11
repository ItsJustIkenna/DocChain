import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * PUT /api/reviews/[id]
 * Update a review (patient) or add response (doctor)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reviewId = params.id;
    const body = await request.json();

    // Get review details
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    let updateData: any = {};

    // Check if user is the patient (updating review) or doctor (adding response)
    if (user.id === review.patient_id) {
      // Patient updating their review
      if (body.rating !== undefined) {
        if (body.rating < 1 || body.rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 1 and 5' },
            { status: 400 }
          );
        }
        updateData.rating = body.rating;
      }
      if (body.comment !== undefined) {
        updateData.comment = body.comment;
      }
      updateData.updated_at = new Date().toISOString();
    } else if (user.id === review.doctor_id) {
      // Doctor adding response
      if (body.response !== undefined) {
        updateData.response = body.response;
        updateData.responded_at = new Date().toISOString();
      }
    } else {
      return NextResponse.json(
        { error: 'You are not authorized to update this review' },
        { status: 403 }
      );
    }

    // Update review
    const { data: updatedReview, error: updateError } = await supabaseAdmin
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update review:', updateError);
      return NextResponse.json(
        { error: 'Failed to update review' },
        { status: 500 }
      );
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: user.id === review.patient_id ? 'review_updated' : 'review_response_added',
      resource_type: 'review',
      resource_id: reviewId,
      details: updateData,
    });

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });

  } catch (error) {
    console.error('Update review error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Delete a review (patient only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const reviewId = params.id;

    // Get review details
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .select('patient_id')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Verify user owns the review
    if (user.id !== review.patient_id) {
      return NextResponse.json(
        { error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // Delete review
    const { error: deleteError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Failed to delete review:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete review' },
        { status: 500 }
      );
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'review_deleted',
      resource_type: 'review',
      resource_id: reviewId,
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully',
    });

  } catch (error) {
    console.error('Delete review error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
