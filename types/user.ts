export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  online: boolean;
  createdAt: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}
