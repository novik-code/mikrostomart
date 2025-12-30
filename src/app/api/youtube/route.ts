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
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=9&type=video`
        );

        if (!response.ok) {
            throw new Error(`YouTube API Error: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform data to our simpler format
        const videos = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
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
