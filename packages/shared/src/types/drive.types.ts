import { CompanyStatus, DriveStatus } from '../constants/status';

export interface Company {
    $id: string;
    tenantId: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    contactPerson: string;
    status: CompanyStatus;
    $createdAt: string;
}

export interface CreateCompanyInput {
    name: string;
    contactEmail: string;
    contactPhone: string;
    contactPerson: string;
    password: string;
}

export interface UpdateCompanyInput {
    name?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactPerson?: string;
    status?: CompanyStatus;
}

export interface Drive {
    $id: string;
    companies: string;       // relationship – company doc ID
    title: string;
    status: DriveStatus;     // draft | active | closed
    jobLevel: string;
    jobType: string;
    experience: string;
    ctcPeriod: string;
    location: string;
    vacancies: number;
    description: string;
    salary: number;
    deadline: string;
    department: string[];    // enum array – multi-select departments
    studyingYear: string;    // enum – 1st, 2nd, 3rd, 4th, 5th, graduate
    externalLink: string;    // URL – external application link
    CGPA: number;
    Backlogs: number;
    $createdAt: string;
    $updatedAt: string;
}

export interface CreateDriveInput {
    companies: string;       // company doc ID
    title: string;
    status?: DriveStatus;    // defaults to 'active' on creation
    jobLevel: string;
    jobType: string;
    experience: string;
    ctcPeriod: string;
    location: string;
    vacancies: number;
    description: string;
    salary: number;
    deadline: string;
    department: string[];    // enum array
    studyingYear: string;
    externalLink: string;
    CGPA: number;
    Backlogs: number;
}

export interface UpdateDriveInput {
    title?: string;
    status?: DriveStatus;
    jobLevel?: string;
    jobType?: string;
    experience?: string;
    ctcPeriod?: string;
    location?: string;
    vacancies?: number;
    description?: string;
    salary?: number;
    deadline?: string;
    department?: string[];
    studyingYear?: string;
    externalLink?: string;
    CGPA?: number;
    Backlogs?: number;
}
