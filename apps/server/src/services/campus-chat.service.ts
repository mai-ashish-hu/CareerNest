import { ID, Query } from 'node-appwrite';
import {
    CampusChatChannel,
    CampusChatMessage,
    SendCampusChatMessageInput,
} from '@careernest/shared';
import { databases } from '../config/appwrite';
import { env } from '../config/env';
import { NotFoundError, ValidationError } from '../utils/errors';
import { studentService } from './student.service';

const DEFAULT_CHANNELS = [
    {
        slug: 'general',
        name: 'General',
        description: 'Daily campus conversations and introductions.',
    },
    {
        slug: 'placements',
        name: 'Placements',
        description: 'Discuss drives, interview prep, and placement updates.',
    },
    {
        slug: 'projects',
        name: 'Projects',
        description: 'Find collaborators and share project progress.',
    },
] as const;

function normalizeText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function nullableText(value: unknown): string | null {
    const normalized = normalizeText(value);
    return normalized || null;
}

export class CampusChatService {
    private readonly databaseId = env.APPWRITE_DATABASE_ID;
    private readonly channelCollectionId = env.COLLECTION_CAMPUS_CHAT_CHANNELS;
    private readonly messageCollectionId = env.COLLECTION_CAMPUS_CHAT_MESSAGES;
    private readonly profileCollectionId = env.COLLECTION_STUDENT_PROFILES;

    private getErrorMessage(error: unknown): string {
        const maybeError = error as { response?: { message?: string }; message?: string };
        return maybeError?.response?.message || maybeError?.message || '';
    }

    private isDocumentNotFoundError(error: unknown): boolean {
        const maybeError = error as { response?: { type?: string; code?: number }; code?: number };
        const message = this.getErrorMessage(error);
        return maybeError?.response?.type === 'document_not_found'
            || maybeError?.response?.code === 404
            || maybeError?.code === 404
            || (message.includes('Document with the requested ID') && message.includes('could not be found'));
    }

    private isMissingSchemaError(error: unknown): boolean {
        const message = this.getErrorMessage(error);
        return [
            'Collection with the requested ID could not be found',
            'Unknown attribute',
            'Attribute not found',
        ].some((fragment) => message.includes(fragment));
    }

    private schemaError(): ValidationError {
        return new ValidationError(
            'Campus chat collections are not configured. Complete the Appwrite chat setup before using this feature.'
        );
    }

    private async getProfilePicture(studentId: string): Promise<string | null> {
        try {
            const doc = await databases.getDocument(this.databaseId, this.profileCollectionId, studentId);
            return nullableText((doc as Record<string, unknown>).profilePicture);
        } catch {
            return null;
        }
    }

    private async ensureDefaultChannels(tenantId: string): Promise<Array<Record<string, any>>> {
        try {
            const existing = await databases.listDocuments(this.databaseId, this.channelCollectionId, [
                Query.equal('tenantId', tenantId),
                Query.limit(50),
                Query.orderAsc('name'),
            ]);

            const existingBySlug = new Map(
                existing.documents.map((doc) => [normalizeText(doc.slug), doc as Record<string, any>])
            );

            for (const channel of DEFAULT_CHANNELS) {
                if (existingBySlug.has(channel.slug)) continue;
                const created = await databases.createDocument(
                    this.databaseId,
                    this.channelCollectionId,
                    ID.unique(),
                    {
                        tenantId,
                        slug: channel.slug,
                        name: channel.name,
                        description: channel.description,
                        isDefault: true,
                    }
                );
                existingBySlug.set(channel.slug, created as Record<string, any>);
            }

            return [...existingBySlug.values()].sort((a, b) =>
                normalizeText(a.name).localeCompare(normalizeText(b.name))
            );
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.schemaError();
            }
            throw error;
        }
    }

    async listChannels(tenantId: string): Promise<CampusChatChannel[]> {
        const channels = await this.ensureDefaultChannels(tenantId);
        return channels.map((channel) => ({
            id: String(channel.$id || ''),
            name: normalizeText(channel.name),
            slug: normalizeText(channel.slug),
            description: normalizeText(channel.description),
            isDefault: Boolean(channel.isDefault),
        }));
    }

    private async getChannel(tenantId: string, channelId: string): Promise<Record<string, any>> {
        try {
            const channel = await databases.getDocument(this.databaseId, this.channelCollectionId, channelId);
            if (normalizeText((channel as Record<string, unknown>).tenantId) !== tenantId) {
                throw new NotFoundError('Campus chat channel');
            }
            return channel as Record<string, any>;
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.schemaError();
            }
            if (error instanceof NotFoundError) {
                throw error;
            }
            if (this.isDocumentNotFoundError(error)) {
                throw new NotFoundError('Campus chat channel');
            }
            throw error;
        }
    }

    async listMessages(
        tenantId: string,
        channelId: string,
        currentStudentId: string
    ): Promise<CampusChatMessage[]> {
        await this.getChannel(tenantId, channelId);

        try {
            const result = await databases.listDocuments(this.databaseId, this.messageCollectionId, [
                Query.equal('tenantId', tenantId),
                Query.equal('channelId', channelId),
                Query.limit(100),
                Query.orderDesc('$createdAt'),
            ]);

            return result.documents
                .slice()
                .reverse()
                .map((message) => ({
                    id: String(message.$id || ''),
                    channelId: normalizeText(message.channelId),
                    body: normalizeText(message.body),
                    createdAt: normalizeText(message.$createdAt),
                    mine: normalizeText(message.senderStudentId) === currentStudentId,
                    sender: {
                        studentId: normalizeText(message.senderStudentId),
                        name: normalizeText(message.senderName),
                        departmentName: normalizeText(message.senderDepartmentName),
                        profilePicture: normalizeText(message.senderProfilePicture),
                    },
                }));
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.schemaError();
            }
            throw error;
        }
    }

    async sendMessage(
        tenantId: string,
        studentUserId: string,
        email: string,
        input: SendCampusChatMessageInput
    ): Promise<CampusChatMessage> {
        const student = await studentService.getByUserId(studentUserId, tenantId, email);
        await this.getChannel(tenantId, input.channelId);

        const departmentField = student.departements ?? student.departments ?? student.department;
        const senderDepartmentName = typeof departmentField === 'object' && departmentField
            ? normalizeText((departmentField as Record<string, unknown>).departmentName)
                || normalizeText((departmentField as Record<string, unknown>).name)
            : normalizeText(departmentField);

        try {
            const message = await databases.createDocument(
                this.databaseId,
                this.messageCollectionId,
                ID.unique(),
                {
                    tenantId,
                    channelId: input.channelId,
                    senderStudentId: String(student.$id || studentUserId),
                    senderName: normalizeText(student.name),
                    senderDepartmentName,
                    senderProfilePicture: await this.getProfilePicture(String(student.$id || studentUserId)),
                    body: normalizeText(input.body),
                }
            );

            return {
                id: String(message.$id || ''),
                channelId: normalizeText(message.channelId),
                body: normalizeText(message.body),
                createdAt: normalizeText(message.$createdAt),
                mine: true,
                sender: {
                    studentId: normalizeText(message.senderStudentId),
                    name: normalizeText(message.senderName),
                    departmentName: normalizeText(message.senderDepartmentName),
                    profilePicture: normalizeText(message.senderProfilePicture),
                },
            };
        } catch (error) {
            if (this.isMissingSchemaError(error)) {
                throw this.schemaError();
            }
            throw error;
        }
    }
}

export const campusChatService = new CampusChatService();
