import { Client, Databases, Users, Storage, Account, Teams } from 'node-appwrite';
import { env } from './env';

// Server-side Appwrite client (uses API key for full access)
const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

export const databases = new Databases(client);
export const users = new Users(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

// For session-based operations using Appwrite session secret
export function createSessionClient(sessionSecret: string) {
    const sessionClient = new Client()
        .setEndpoint(env.APPWRITE_ENDPOINT)
        .setProject(env.APPWRITE_PROJECT_ID)
        .setSession(sessionSecret);

    return {
        account: new Account(sessionClient),
        databases: new Databases(sessionClient),
    };
}

// Legacy: For JWT-based operations (kept for backward compatibility)
export function createJWTClient(jwt: string) {
    const jwtClient = new Client()
        .setEndpoint(env.APPWRITE_ENDPOINT)
        .setProject(env.APPWRITE_PROJECT_ID)
        .setJWT(jwt);

    return {
        account: new Account(jwtClient),
        databases: new Databases(jwtClient),
    };
}

export { client };
