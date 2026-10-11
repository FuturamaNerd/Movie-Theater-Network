export type avatar = File; //The file type is JPEG, PNG or WEBP; size less than 2MB

export interface RegistrationRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationWithAvatar extends RegistrationRequest {
  avatar: File; //The file type is JPEG, PNG or WEBP; size less than 2MB
}

export interface profile {
  fullName: string;
  mobileNumber: string;
  dateOfBirth: string;
  avatar : File; //The file type is JPEG, PNG or WEBP; size less than 2MB
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  fullName: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  age: number | null;
  profileComplete: boolean;
}

export interface AuthResponse {
  data: {
    user: AuthUser;
    token: string;
  };
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}