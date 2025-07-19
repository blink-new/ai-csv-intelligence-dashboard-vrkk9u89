import { useContext } from 'react';
import { DataContext } from '../contexts/dataContext';

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};