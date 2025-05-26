type Message = {
  id: string;
  content: string;
  user: MessageUser;
  group_id: string;
  timestamp: string;
};

type RawMessage = {
  content: string;
  sender_id: string;
  group_id: string;
};

type MessageUser = {
  id: string;
  username: string;
};

type User = {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
  group_admin_map?: GroupAdminMap;
};

type GroupAdminMap = Map<string, boolean>;

type GroupUser = User & { admin: boolean; invited_at?: string };

type Group = {
  id: string;
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

interface CreateGroupParams {
  name: string;
  start_time: string;
  end_time: string;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
}

type UpdateGroupParams = {
  name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  description?: string | null;
  location?: string | null;
  image_url?: string | null;
};

type UserGroup = {
  id: string;
  user_id: string;
  group_id: string;
  admin: boolean;
  created_at: string;
  updated_at: string;
};

type DateOptions = {
  startTime: Date | null;
  endTime: Date | null;
};

type PickerImageResult = {
  url: string;
  base64: string;
};

export {
  Message,
  RawMessage,
  User,
  Group,
  CreateGroupParams,
  UpdateGroupParams,
  UserGroup,
  GroupAdminMap,
  GroupUser,
  MessageUser,
  DateOptions,
  PickerImageResult,
};
