
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Message {
  id: string;
  role: Role;
  text: string;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface Document {
  id: string;
  name: string;
  chunks: string[];
}