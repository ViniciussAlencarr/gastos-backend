export interface Gasto {
    value: number;
    description: string;
    userId: string;
    category: string;
    status: string;
    date: Date;
}

export interface Usuario {
    _id: string;
    name: string;
    email: string;
    password: string;
}