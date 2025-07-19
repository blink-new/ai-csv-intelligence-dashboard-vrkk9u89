import { createContext } from 'react';
import { DataContextType } from '../types/dataContext';

export const DataContext = createContext<DataContextType | undefined>(undefined);