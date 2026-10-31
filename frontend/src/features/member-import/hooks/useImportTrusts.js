import { useApiQuery } from '../../../hooks/useApiQuery';
import { fetchImportTrusts } from '../services/memberImportService';

export const useImportTrusts = () => useApiQuery(['member-import-trusts'], fetchImportTrusts);
