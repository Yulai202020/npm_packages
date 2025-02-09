import { exec } from 'node:child_process';
import util from 'util';

const execPromise = util.promisify(exec);

async function getGithubData(username) {
    try {
        const response = await fetch(
            `https://api.github.com/users/${username}`
        );

        if (!response.ok) {
            throw new Error('User not found');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function getDataFromUrl(ssh_url) {
    const [ssh_user, host, user, repo] = ssh_url.split(/[@:/]/);

    return [ssh_user, host, user, repo];
}

async function getRepositoryUrl() {
    try {
        const { stdout, stderr } = await execPromise(
            'git remote get-url origin'
        );

        return stdout.slice(0, -1); // remove latest enter
    } catch (error) {
        console.error(`Error executing command: ${error}`);
    }
}

export { getGithubData, getDataFromUrl, getRepositoryUrl };
