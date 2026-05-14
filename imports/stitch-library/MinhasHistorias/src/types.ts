export interface Story {
  id: string;
  title: string;
  lastAccess: string;
  chapter: number;
  totalChapters: number;
  progress: number;
  imageUrl: string;
  genre: string;
  status?: 'completed' | 'in-progress';
  rating?: number;
  date?: string;
}
