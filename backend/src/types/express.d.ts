declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: import('mongoose').Types.ObjectId;
        name: string;
        email: string;
        role: 'teacher' | 'student';
      };
    }
  }
}

export {};
