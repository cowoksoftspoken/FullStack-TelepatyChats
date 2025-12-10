interface Group {
  uid: string;
  displayName: string;
  photoURL?: string;
  members: string[];
  admins: string[];
  createdAt: string;
  createdBy: string;
  type: "group";
}
