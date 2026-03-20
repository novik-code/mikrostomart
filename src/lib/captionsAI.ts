/**
 * Captions / Mirage API integration
 * Replaces Shotstack for professional video captioning
 * API docs: https://captions.ai/help/docs/api/video-captions
 */

const MIRAGE_API_BASE = 'https://api.mirage.app/v1';

// Default caption template — can be changed per-video
// "Buzz" template — clean, modern animated captions
const DEFAULT_CAPTION_TEMPLATE = 'ctpl_DxflLOnuKkb198FNdI9E';

function getApiKey(): string {
    const key = process.env.MIRAGE_API_KEY;
    if (!key) throw new Error('MIRAGE_API_KEY not configured');
    return key;
}

/**
 * List available caption templates
 */
export async function listCaptionTemplates(): Promise<any[]> {
    const res = await fetch(`${MIRAGE_API_BASE}/videos/captions/templates`, {
        headers: { 'x-api-key': getApiKey() },
    });

    if (!res.ok) {
        throw new Error(`List templates failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.data || data;
}

/**
 * Submit a video for captioning via Mirage API
 * Returns the video job ID for polling
 */
export async function submitForCaptioning(
    videoBuffer: Buffer,
    fileName: string,
    captionTemplateId?: string,
): Promise<{ videoId: string; status: string }> {
    const apiKey = getApiKey();
    const templateId = captionTemplateId || DEFAULT_CAPTION_TEMPLATE;

    console.log(`[CaptionsAI] Submitting video (${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB) with template: ${templateId}`);

    // Create multipart form data
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('video', blob, fileName);
    formData.append('caption_template_id', templateId);

    const res = await fetch(`${MIRAGE_API_BASE}/videos/captions`, {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
        },
        body: formData,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Captions API submit failed: ${res.status} — ${errText}`);
    }

    const data = await res.json();
    console.log(`[CaptionsAI] Job submitted: ${data.id}, status: ${data.status}`);

    return {
        videoId: data.id,
        status: data.status, // QUEUED, PROCESSING, COMPLETE, FAILED
    };
}

/**
 * Check the status of a captioning job
 */
export async function checkCaptioningStatus(videoId: string): Promise<{
    status: 'QUEUED' | 'PROCESSING' | 'COMPLETE' | 'FAILED' | 'CANCELLED';
    progress: number;
    error?: string;
}> {
    const res = await fetch(`${MIRAGE_API_BASE}/videos/${videoId}`, {
        headers: { 'x-api-key': getApiKey() },
    });

    if (!res.ok) {
        throw new Error(`Check status failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log(`[CaptionsAI] Job ${videoId}: status=${data.status}, progress=${data.progress}`);

    return {
        status: data.status,
        progress: data.progress || 0,
        error: data.error || undefined,
    };
}

/**
 * Download the captioned video
 */
export async function downloadCaptionedVideo(videoId: string): Promise<Buffer> {
    console.log(`[CaptionsAI] Downloading captioned video: ${videoId}`);

    const res = await fetch(`${MIRAGE_API_BASE}/videos/${videoId}/content`, {
        headers: { 'x-api-key': getApiKey() },
        redirect: 'follow',
    });

    if (!res.ok) {
        throw new Error(`Download failed: ${res.status} ${await res.text()}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    console.log(`[CaptionsAI] Downloaded captioned video: ${(buffer.length / 1024 / 1024).toFixed(1)}MB`);

    return buffer;
}
