
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const REPO_OWNER = 'novik-code'; // Hardcoded based on remote url or env? Better to env or simple extraction
const REPO_NAME = 'mikrostomart';

// Simple helper to get current file SHA (if exists) to allow updates
async function getFileSha(path: string) {
    if (!GITHUB_TOKEN) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.sha;
    } catch (e) {
        return null;
    }
}

export async function getFileContent(path: string) {
    if (!GITHUB_TOKEN) return null;
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
            }
        });
        if (!res.ok) return null;
        const data = await res.json();
        // content is base64
        return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (e) {
        console.error("Error fetching file content:", e);
        return null;
    }
}

export async function uploadToRepo(
    path: string,
    content: string | Buffer,
    message: string,
    encoding: 'utf-8' | 'base64' = 'utf-8'
) {
    if (!GITHUB_TOKEN) {
        console.error("Missing GITHUB_ACCESS_TOKEN");
        return false;
    }

    const sha = await getFileSha(path);

    let contentString = '';
    if (encoding === 'base64') {
        contentString = Buffer.isBuffer(content)
            ? content.toString('base64')
            : content; // Assume validation
    } else {
        contentString = Buffer.isBuffer(content)
            ? content.toString('base64') // API always expects base64 for content field usually? No, it accepts text but base64 is safer for all
            : Buffer.from(content).toString('base64');
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                content: contentString,
                sha: sha || undefined, // Include SHA if updating
                branch: 'main'
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("GitHub Upload Error:", err);
            return false;
        }
        return true;
    } catch (e) {
        console.error("GitHub Upload Exception:", e);
        return false;
    }
}

// Config Helper
export function getRepoConfig() {
    // Ideally these are envs too, but for this specific client we can default
    return { owner: REPO_OWNER, repo: REPO_NAME };
}
