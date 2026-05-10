import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 3600; // ISR: cache for 1 hour

const PLACE_ID = 'ChIJ-5k3xu5SEEcRJhqtusOhhwM';
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
            rating: Math.round(avgRating * 10) / 10,
            totalReviews: shuffled.length,
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
            console.log(`[Google Reviews] New API: ${reviews.length} reviews`);
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
