declare namespace Express {
  interface User {
    id: string;
    role: string;
    email?: string;
  }

  interface Request {
    user?: User;
  }
}
