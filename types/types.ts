type Message = {
  msg: string;
  user: User;
};

type User = {
  username: string;
};

type Room = {
  id: string;
  name: string;
  admin: User;
};

export { Message, User, Room };
