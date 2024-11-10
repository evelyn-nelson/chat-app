type Message = {
  msg: string;
  user: User;
};

type User = {
  username: string;
};

type Group = {
  id: string;
  name: string;
  admin: User;
};

export { Message, User, Group };
