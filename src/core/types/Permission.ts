
export type Area = 'person' | 'record' | 'permission'
export type PermissionKey =
| 'no-access'  
| 'read'
  | 'read+write_ex_delete'
  | 'full'
  | string


export type PermissionKeyMapping = {
  key: PermissionKey;
  operations: string[];
}

export type Field = {
  name: Area;
  keys: PermissionKeyMapping[];
}

export type PermissionMap = Field[];

export type Operator = {
  userId?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  federation?: string;
  federationId?: string;
};

export type Permission = {
    userId: string;
    operation: string;
    domain: string;
}