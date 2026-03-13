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
    $id: string;                     // custom ID = student PRN / registration number
    password?: string;               // stored as plaintext in Appwrite DB
    name: string;
    email: string;
    department: string | { $id: string; departmentName?: string; [key: string]: unknown }; // relationship (many-to-one)
    enrollmentYear: number;
    phoneNumber: number;
    address: string;
    colleges: string | { $id: string; name?: string; [key: string]: unknown }; // relationship (many-to-one)
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateStudentInput {
    studentId: string;               // used as $id (document ID)
    password: string;                // stored as plaintext in Appwrite DB
    name: string;
    email: string;
    department: string;              // department document ID
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
