import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour (ISR)

const PLACE_ID = 'ChIJ-5k3xu5SEEcRJhqtusOhhwM';

// In-memory cache to avoid hitting Google API too often
let cachedData: { reviews: any[]; rating: number; totalReviews: number; fetchedAt: number } | null = null;
const CACHE_TTL = 3600 * 1000; // 1 hour in ms

/**
 * GET /api/google-reviews
 * 
 * Fetches real reviews from Google Places API (New) for Mikrostomart.
 * Results are cached in-memory for 1 hour to minimize API costs.
 */
export async function GET() {
    try {
        // Return cached data if fresh
        if (cachedData && Date.now() - cachedData.fetchedAt < CACHE_TTL) {
            return NextResponse.json({
                success: true,
                reviews: cachedData.reviews,
                rating: cachedData.rating,
                totalReviews: cachedData.totalReviews,
                cached: true,
            });
        }

        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            console.error('[Google Reviews] GOOGLE_PLACES_API_KEY not configured');
            return NextResponse.json({
                success: false,
                error: 'Google Places API key not configured',
            }, { status: 500 });
        }

        // Use Places API (New) — Place Details endpoint
        // https://developers.google.com/maps/documentation/places/web-service/place-details
        const fields = 'reviews,rating,userRatingCount';
        const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=${fields}&languageCode=pl`;

        console.log(`[Google Reviews] Fetching from Places API (New)...`);

        const response = await fetch(url, {
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': fields,
            },
            next: { revalidate: 3600 }, // Next.js cache
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Google Reviews] API error ${response.status}:`, errorText);

            // If Places API (New) fails, try legacy API
            return await fetchLegacyAPI(apiKey);
        }

        const data = await response.json();

        const reviews = (data.reviews || []).map((review: any) => ({
            author: review.authorAttribution?.displayName || 'Anonim',
            authorPhoto: review.authorAttribution?.photoUri || null,
            rating: review.rating || 5,
            text: review.text?.text || review.originalText?.text || '',
            date: review.relativePublishTimeDescription || '',
            publishTime: review.publishTime || '',
            googleMapsUri: review.googleMapsUri || '',
        })).filter((r: any) => r.rating >= 4); // Only show positive reviews (4★+)

        const result = {
            reviews,
            rating: data.rating || 5.0,
            totalReviews: data.userRatingCount || reviews.length,
            fetchedAt: Date.now(),
        };

        // Update cache
        cachedData = result;

        console.log(`[Google Reviews] Fetched ${reviews.length} reviews (rating: ${data.rating})`);

        return NextResponse.json({
            success: true,
            ...result,
            cached: false,
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
 * Fallback: Legacy Place Details API
 */
async function fetchLegacyAPI(apiKey: string) {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&language=pl&key=${apiKey}`;

        console.log(`[Google Reviews] Trying legacy API...`);

        const response = await fetch(url, {
            next: { revalidate: 3600 },
        });

        if (!response.ok) {
            throw new Error(`Legacy API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== 'OK') {
            throw new Error(`Google API status: ${data.status} — ${data.error_message || ''}`);
        }

        const result = data.result || {};
        const reviews = (result.reviews || []).map((review: any) => ({
            author: review.author_name || 'Anonim',
            authorPhoto: review.profile_photo_url || null,
            rating: review.rating || 5,
            text: review.text || '',
            date: review.relative_time_description || '',
            publishTime: review.time ? new Date(review.time * 1000).toISOString() : '',
            googleMapsUri: review.author_url || '',
        })).filter((r: any) => r.rating >= 4); // Only show positive reviews (4★+)

        const cacheResult = {
            reviews,
            rating: result.rating || 5.0,
            totalReviews: result.user_ratings_total || reviews.length,
            fetchedAt: Date.now(),
        };

        cachedData = cacheResult;

        console.log(`[Google Reviews] Legacy API: ${reviews.length} reviews (rating: ${result.rating})`);

        return NextResponse.json({
            success: true,
            ...cacheResult,
            cached: false,
            source: 'legacy',
        });

    } catch (error) {
        console.error('[Google Reviews] Legacy API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
