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

type Group = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
};

type UserGroup = {
  id: number;
  user_id: number;
  group_id: number;
  admin: boolean;
  created_at: string;
  updated_at: string;
};

export { Message, RawMessage, User, Group, UserGroup, GroupAdminMap };
