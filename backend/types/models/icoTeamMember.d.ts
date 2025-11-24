interface icoTeamMemberAttributes {
  id: string;
  offeringId: string;
  name: string;
  role: string;
  bio: string;
  avatar?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  github?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

interface icoTeamMemberCreationAttributes
  extends Partial<icoTeamMemberAttributes> {}
