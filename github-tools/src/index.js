import { exec } from 'node:child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function getRepositoryUrl() {
    try {
        const { stdout } = await execPromise('git remote get-url origin');
        return stdout.trim();
    } catch (error) {
        return null;
    }
}

function getDataFromUrl(url) {
    if (!url) return [];

    const cleaned = url.replace(/\.git$/, '');
    return cleaned.split(/[@:/]+/);
}

async function getGithubData(username) {
    if (!username) return null;

    try {
        const response = await fetch(
            `https://api.github.com/users/${username}`
        );
        if (!response.ok) throw new Error('GitHub user not found');

        return await response.json();
    } catch (err) {
        console.warn(
            `[github-tools] Failed to fetch user data for "${username}":`,
            err.message
        );
        return null;
    }
}

async function getGitMeta({ fallbackToGitHub = true } = {}) {
    const url = await getRepositoryUrl();

    if (!url || !fallbackToGitHub) {
        return {
            repoUrl: null,
            author: null,
            baseName: null,
        };
    }

    const [_, host, user, repo] = getDataFromUrl(url);
    const data = await getGithubData(user);

    return {
        repoUrl: `https://${host}/${user}/${repo}`,
        author: data?.name || user,
        baseName: data?.login || user,
    };
}

export { getRepositoryUrl, getDataFromUrl, getGithubData, getGitMeta };
