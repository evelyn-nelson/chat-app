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

type GroupUser = User & { admin: boolean; invited_at?: string };

type Group = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  admin: boolean;
  start_time: string | null;
  end_time: string | null;
  group_users: GroupUser[];
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
};

type UpdateGroupParams = {
  name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
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
  startTime: Date | null;
  endTime: Date | null;
};

type PickerImageResult = {
  uri: string;
  base64: string;
};

export {
  Message,
  RawMessage,
  User,
  Group,
  UpdateGroupParams,
  UserGroup,
  GroupAdminMap,
  GroupUser,
  MessageUser,
  DateOptions,
  PickerImageResult,
};
