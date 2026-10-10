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