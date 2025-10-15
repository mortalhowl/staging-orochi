// src/types/common.ts
import type { Event } from './events';

export interface Sorting {
    column: keyof Event | 'created_at';
    direction: 'asc' | 'desc';
}