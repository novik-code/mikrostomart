import { NextResponse } from "next/server";

export async function GET() {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

    if (!API_KEY || !CHANNEL_ID) {
        return NextResponse.json(
            { error: "API Key or Channel ID missing" },
            { status: 500 }
        );
    }

    try {
        // Step 1: Get Uploads Playlist ID (Cost: 1 unit)
        const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
        );

        if (!channelResponse.ok) {
            throw new Error(`YouTube Channel API Error: ${channelResponse.statusText}`);
        }

        const channelData = await channelResponse.json();
        const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

        if (!uploadsPlaylistId) {
            throw new Error("Could not find uploads playlist for this channel");
        }

        // Step 2: Get Videos from Uploads Playlist (Cost: 1 unit)
        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&key=${API_KEY}&maxResults=9`
        );

        if (!playlistResponse.ok) {
            throw new Error(`YouTube Playlist API Error: ${playlistResponse.statusText}`);
        }

        const playlistData = await playlistResponse.json();

        // Transform data to our simpler format
        const videos = playlistData.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            // added publishedAt if ever needed, but main UI uses id/title/thumbnail
        }));

        return NextResponse.json({ videos });
    } catch (error) {
        console.error("Failed to fetch YouTube videos:", error);
        return NextResponse.json(
            { error: "Failed to fetch videos" },
            { status: 500 }
        );
    }
}
