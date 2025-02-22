type Message = {
  id: number;
  content: string;
  user: MessageUser;
  group_id: number;
  timestamp: string;
};

type RawMessage = {
  content: string;
  sender_id: number;
  group_id: number;
};

type MessageUser = {
  id: number;
  username: string;
};

type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  group_admin_map?: GroupAdminMap;
};

type GroupAdminMap = Map<number, boolean>;

type GroupUser = User & { admin: boolean };

type Group = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  group_users: GroupUser[];
};

type UserGroup = {
  id: number;
  user_id: number;
  group_id: number;
  admin: boolean;
  created_at: string;
  updated_at: string;
};

type DateOptions = {
  startDate: Date;
  endDate: Date;
};

export {
  Message,
  RawMessage,
  User,
  Group,
  UserGroup,
  GroupAdminMap,
  GroupUser,
  MessageUser,
  DateOptions,
};
