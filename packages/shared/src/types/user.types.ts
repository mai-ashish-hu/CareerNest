import { Role } from '../constants/roles';
import { UserStatus } from '../constants/status';

export interface User {
    $id: string;
    tenantId: string;
    role: Role;
    email: string;
    name: string;
    department?: string;
    status: UserStatus;
    $createdAt: string;
}

export interface CreateUserInput {
    tenantId: string;
    role: Role;
    email: string;
    name: string;
    password: string;
    department?: string;
}

export interface Student {
    $id: string;
    userid: string;          // Appwrite auth user ID
    name: string;
    email: string;
    department: string;
    enrollmentYear: number;
    phoneNumber: number;
    address: string;
    colleges: string;        // relationship – college (tenant) doc ID
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateStudentInput {
    name: string;
    email: string;
    password: string;
    department: string;
    enrollmentYear: number;
    phoneNumber: number;
    address: string;
}

export interface BulkCreateStudentInput {
    students: CreateStudentInput[];
}

export interface UpdateStudentInput {
    department?: string;
    enrollmentYear?: number;
    phoneNumber?: number;
    address?: string;
}
