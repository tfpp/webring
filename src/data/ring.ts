import data from './members.json';
import { validateMembers } from '../lib/ring';

export const members = validateMembers(data);
