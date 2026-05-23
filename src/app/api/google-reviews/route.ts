import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { brand } from '@/lib/brandConfig';

export const revalidate = 3600; // ISR: cache for 1 hour

// H8 (2026-05-10): single source of truth — Place ID lives in brandConfig.
// Fallback hardcoded value zachowany dla bezpieczeństwa (brand load fail).
const PLACE_ID = brand.googlePlaceId || 'ChIJ-5k3xu5SEEcRJhqtusOhhwM';
const MIN_RATING = 4; // Only show 4★+ reviews

// In-memory timestamp to throttle Google API calls (1 fetch per hour)
let lastFetchTime = 0;
const FETCH_INTERVAL = 3600 * 1000; // 1 hour

/**
 * GET /api/google-reviews
 * 
 * Returns all cached positive reviews from Supabase (accumulated over time).
 * Periodically fetches new reviews from Google Places API and upserts them.
 * Reviews are returned in random order for variety on each page load.
 */
export async function GET() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Periodically fetch new reviews from Google and store them
        const shouldFetch = Date.now() - lastFetchTime > FETCH_INTERVAL;

        if (shouldFetch && process.env.GOOGLE_PLACES_API_KEY) {
            lastFetchTime = Date.now();
            // Fire and forget — don't block the response
            fetchAndStoreReviews(supabase).catch(err =>
                console.error('[Google Reviews] Background fetch error:', err)
            );
        }

        // 2. Return all stored positive reviews from Supabase
        const { data: reviews, error } = await supabase
            .from('google_reviews')
            .select('*')
            .gte('rating', MIN_RATING)
            .order('publish_time', { ascending: false });

        if (error) {
            console.error('[Google Reviews] DB read error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Shuffle reviews randomly
        const shuffled = shuffleArray(reviews || []);

        // Get overall rating from Google (or calculate from stored)
        const allRatings = (reviews || []).map(r => r.rating);
        const avgRating = allRatings.length > 0
            ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
            : 5.0;

        // 2026-05-23 (GSC fix follow-up): fetch authoritative aggregate from
        // google_business_meta (singleton row, mig 135). UI carousel używa
        // tych liczb (280/4.5) zamiast naszego limited cached count/avg.
        // Schema markup już używa tego źródła przez getAggregateRating().
        let googleBusinessAggregate: { count: number; rating: number } | null = null;
        try {
            const { data: metaRow } = await supabase
                .from('google_business_meta')
                .select('user_rating_count, rating')
                .eq('id', 1)
                .single();
            if (metaRow && typeof metaRow.user_rating_count === 'number' && typeof metaRow.rating === 'number') {
                googleBusinessAggregate = {
                    count: metaRow.user_rating_count,
                    rating: metaRow.rating,
                };
            }
        } catch {
            // Silent — UI will fall back to legacy rating/totalReviews
        }

        return NextResponse.json({
            success: true,
            reviews: shuffled.map(r => ({
                author: r.google_author_name,
                authorPhoto: r.author_photo_url,
                rating: r.rating,
                text: r.review_text,
                date: r.relative_date || '',
                publishTime: r.publish_time || '',
                googleMapsUri: r.google_maps_uri || '',
            })),
            // Legacy fields — backward compat, fallback gdy googleBusinessAggregate null
            rating: Math.round(avgRating * 10) / 10,
            totalReviews: shuffled.length,
            // Authoritative aggregate (preferred by GoogleReviews.tsx)
            googleBusinessAggregate,
        });

    } catch (error) {
        console.error('[Google Reviews] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

/**
 * Fetch reviews from Google Places API and upsert into Supabase.
 * Fetches twice with different sort orders to maximize unique reviews.
 */
async function fetchAndStoreReviews(supabase: any) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY!;
    let allReviews: any[] = [];
    // 2026-05-23 (GSC fix wariant D): capture authoritative aggregate from
    // Google Places API New for google_business_meta singleton. Earlier we
    // already had `userRatingCount` in field mask but ignored the values —
    // now we store them, and schema's aggregateRating reads from this row
    // instead of computing avg/count from limited (~23) google_reviews cache.
    let authoritativeRating: number | null = null;
    let authoritativeCount: number | null = null;

    // Try Places API (New) first
    try {
        const fields = 'reviews,rating,userRatingCount';
        const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=${fields}&languageCode=pl`;

        const response = await fetch(url, {
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fields,
            },
        });

        if (response.ok) {
            const data = await response.json();
            // Capture aggregate first — even if reviews array is empty,
            // these fields are usually present.
            if (typeof data.rating === 'number') authoritativeRating = data.rating;
            if (typeof data.userRatingCount === 'number') authoritativeCount = data.userRatingCount;

            const reviews = (data.reviews || []).map((review: any) => ({
                google_author_name: review.authorAttribution?.displayName || 'Anonim',
                author_photo_url: review.authorAttribution?.photoUri || null,
                rating: review.rating || 5,
                review_text: review.text?.text || review.originalText?.text || '',
                relative_date: review.relativePublishTimeDescription || '',
                publish_time: review.publishTime || null,
                google_maps_uri: review.googleMapsUri || '',
            }));
            allReviews.push(...reviews);
            console.log(`[Google Reviews] New API: ${reviews.length} reviews, aggregate ${authoritativeCount}/${authoritativeRating}`);
        } else {
            console.error(`[Google Reviews] New API error: ${response.status}`);
        }
    } catch (err) {
        console.error('[Google Reviews] New API fetch error:', err);
    }

    // Also try legacy API with different sort (newest) for more variety
    try {
        const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&language=pl&reviews_sort=newest&key=${apiKey}`;

        const response = await fetch(legacyUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'OK' && data.result) {
                // Capture aggregate if new API didn't return it
                if (authoritativeRating === null && typeof data.result.rating === 'number') {
                    authoritativeRating = data.result.rating;
                }
                if (authoritativeCount === null && typeof data.result.user_ratings_total === 'number') {
                    authoritativeCount = data.result.user_ratings_total;
                }
            }
            if (data.status === 'OK' && data.result?.reviews) {
                const reviews = data.result.reviews.map((review: any) => ({
                    google_author_name: review.author_name || 'Anonim',
                    author_photo_url: review.profile_photo_url || null,
                    rating: review.rating || 5,
                    review_text: review.text || '',
                    relative_date: review.relative_time_description || '',
                    publish_time: review.time ? new Date(review.time * 1000).toISOString() : null,
                    google_maps_uri: review.author_url || '',
                }));
                allReviews.push(...reviews);
                console.log(`[Google Reviews] Legacy API (newest): ${reviews.length} reviews`);
            }
        }
    } catch (err) {
        console.error('[Google Reviews] Legacy API fetch error:', err);
    }

    // Also try legacy API with default sort (most relevant) 
    try {
        const legacyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&language=pl&reviews_sort=most_relevant&key=${apiKey}`;

        const response = await fetch(legacyUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'OK' && data.result?.reviews) {
                const reviews = data.result.reviews.map((review: any) => ({
                    google_author_name: review.author_name || 'Anonim',
                    author_photo_url: review.profile_photo_url || null,
                    rating: review.rating || 5,
                    review_text: review.text || '',
                    relative_date: review.relative_time_description || '',
                    publish_time: review.time ? new Date(review.time * 1000).toISOString() : null,
                    google_maps_uri: review.author_url || '',
                }));
                allReviews.push(...reviews);
                console.log(`[Google Reviews] Legacy API (relevant): ${reviews.length} reviews`);
            }
        }
    } catch (err) {
        console.error('[Google Reviews] Legacy API fetch error:', err);
    }

    // Upsert all reviews into Supabase (duplicates handled by UNIQUE constraint)
    if (allReviews.length > 0) {
        // Filter only positive reviews before storing
        const positiveReviews = allReviews.filter(r => r.rating >= MIN_RATING && r.review_text.length > 0);

        let upsertedCount = 0;
        for (const review of positiveReviews) {
            const { error } = await supabase
                .from('google_reviews')
                .upsert(review, {
                    onConflict: 'google_author_name,review_text',
                    ignoreDuplicates: true,
                });
            if (!error) upsertedCount++;
        }

        console.log(`[Google Reviews] Upserted ${upsertedCount}/${positiveReviews.length} positive reviews into DB`);
    }

    // 2026-05-23 (GSC fix wariant D): upsert authoritative aggregate to
    // google_business_meta singleton (id=1). Read by getAggregateRating()
    // for Dentist schema markup. Only update if we got fresh data from
    // either API call — never overwrite with nulls.
    if (authoritativeCount !== null && authoritativeRating !== null) {
        const { error: metaError } = await supabase
            .from('google_business_meta')
            .upsert({
                id: 1,
                user_rating_count: authoritativeCount,
                rating: authoritativeRating,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

        if (metaError) {
            console.error('[Google Reviews] google_business_meta upsert error:', metaError);
        } else {
            console.log(`[Google Reviews] Updated google_business_meta: ${authoritativeCount} reviews, ${authoritativeRating}★`);
        }
    } else {
        console.warn('[Google Reviews] No authoritative aggregate received — google_business_meta not updated');
    }
}

/**
 * Fisher-Yates shuffle for random review order
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
