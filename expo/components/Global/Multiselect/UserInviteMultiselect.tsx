import { StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import TagInput from "@/components/Global/Multiselect/UserMultiselect";
import { useGlobalStore } from "../../context/GlobalStoreContext";
import { User } from "@/types/types";
import UserMultiSelect from "@/components/Global/Multiselect/UserMultiselect";

const UserInviteMultiselect = (props: {
  placeholderText: string;
  userList: string[];
  setUserList: React.Dispatch<React.SetStateAction<string[]>>;
  excludedUserList: User[];
  setExcludedUserList: React.Dispatch<React.SetStateAction<User[]>>;
}) => {
  const {
    placeholderText,
    userList,
    setUserList,
    excludedUserList,
    setExcludedUserList,
  } = props;
  const { store, usersRefreshKey } = useGlobalStore();
  const [contacts, setContacts] = useState<User[]>([]);
  useEffect(() => {
    (async () => {
      try {
        // const users = await store.loadUsers();
        const users = [
          {
            id: 1,
            username: "evelyn",
            email: "evelynnelson000@gmail.com",
            created_at: "2023-01-15T12:34:56Z",
            updated_at: "2023-10-15T08:45:22Z",
          },
          {
            id: 2,
            username: "johndoe",
            email: "johndoe123@gmail.com",
            created_at: "2022-06-23T14:12:03Z",
            updated_at: "2023-08-05T16:13:33Z",
          },
          {
            id: 3,
            username: "sarah",
            email: "sarahmiller@outlook.com",
            created_at: "2021-11-02T10:25:47Z",
            updated_at: "2023-01-17T18:07:01Z",
          },
          {
            id: 4,
            username: "michael",
            email: "michaeladams@icloud.com",
            created_at: "2022-01-09T09:04:22Z",
            updated_at: "2023-07-14T19:09:48Z",
          },
          {
            id: 5,
            username: "lucy",
            email: "lucyturner@aol.com",
            created_at: "2023-02-05T13:50:11Z",
            updated_at: "2023-10-21T12:16:59Z",
          },
          {
            id: 6,
            username: "chris",
            email: "chrisjameson@yahoo.com",
            created_at: "2022-07-25T11:30:05Z",
            updated_at: "2023-03-09T14:44:11Z",
          },
          {
            id: 7,
            username: "hannah",
            email: "hannahparker@gmail.com",
            created_at: "2022-05-16T08:10:34Z",
            updated_at: "2023-08-10T16:25:28Z",
          },
          {
            id: 8,
            username: "kevin",
            email: "kevinbaker@live.com",
            created_at: "2021-12-20T15:32:42Z",
            updated_at: "2023-04-23T10:01:39Z",
          },
          {
            id: 9,
            username: "anna",
            email: "annaperez@hotmail.com",
            created_at: "2022-10-17T13:22:18Z",
            updated_at: "2023-06-18T09:52:12Z",
          },
          {
            id: 10,
            username: "tyler",
            email: "tylermartin@aol.com",
            created_at: "2023-03-01T11:07:54Z",
            updated_at: "2023-09-10T17:18:33Z",
          },
          {
            id: 11,
            username: "james",
            email: "jamesclark@outlook.com",
            created_at: "2022-08-11T16:34:59Z",
            updated_at: "2023-04-15T13:26:49Z",
          },
          {
            id: 12,
            username: "emma",
            email: "emmajones@gmail.com",
            created_at: "2021-09-30T07:45:31Z",
            updated_at: "2023-02-19T14:08:56Z",
          },
          {
            id: 13,
            username: "ben",
            email: "benjaminwilliams@icloud.com",
            created_at: "2023-01-21T10:05:12Z",
            updated_at: "2023-05-12T17:37:20Z",
          },
          {
            id: 14,
            username: "olivia",
            email: "oliviamoore@yahoo.com",
            created_at: "2022-02-08T09:51:25Z",
            updated_at: "2023-07-04T12:14:44Z",
          },
          {
            id: 15,
            username: "jackson",
            email: "jacksonhill@live.com",
            created_at: "2021-12-14T15:57:42Z",
            updated_at: "2023-06-08T18:24:29Z",
          },
          {
            id: 16,
            username: "zoe",
            email: "zoesmith123@outlook.com",
            created_at: "2023-04-19T10:11:03Z",
            updated_at: "2023-08-21T16:53:10Z",
          },
          {
            id: 17,
            username: "matthew",
            email: "matthewroberts@icloud.com",
            created_at: "2022-03-06T07:35:24Z",
            updated_at: "2023-02-02T10:47:52Z",
          },
          {
            id: 18,
            username: "grace",
            email: "gracelane@hotmail.com",
            created_at: "2021-08-17T12:48:01Z",
            updated_at: "2023-03-26T13:15:35Z",
          },
          {
            id: 19,
            username: "lucas",
            email: "lucasbrown@aol.com",
            created_at: "2023-02-25T16:11:17Z",
            updated_at: "2023-09-13T14:22:05Z",
          },
          {
            id: 20,
            username: "bella",
            email: "bellawilson@live.com",
            created_at: "2022-05-03T13:05:42Z",
            updated_at: "2023-10-18T15:01:29Z",
          },
          {
            id: 21,
            username: "charlie",
            email: "charliemoore@outlook.com",
            created_at: "2022-01-28T11:42:13Z",
            updated_at: "2023-07-06T08:35:53Z",
          },
          {
            id: 22,
            username: "lea",
            email: "leawright@aol.com",
            created_at: "2021-10-09T10:30:25Z",
            updated_at: "2023-06-22T17:03:12Z",
          },
          {
            id: 23,
            username: "will",
            email: "willmartin@icloud.com",
            created_at: "2023-03-29T15:11:50Z",
            updated_at: "2023-09-04T13:09:06Z",
          },
          {
            id: 24,
            username: "mia",
            email: "miacarter@gmail.com",
            created_at: "2022-11-12T14:10:01Z",
            updated_at: "2023-07-19T10:56:38Z",
          },
          {
            id: 25,
            username: "zach",
            email: "zacharymills@hotmail.com",
            created_at: "2023-05-03T12:25:58Z",
            updated_at: "2023-09-10T09:13:43Z",
          },
          {
            id: 26,
            username: "lily",
            email: "lilymorris@outlook.com",
            created_at: "2021-07-13T08:02:35Z",
            updated_at: "2023-04-25T16:43:58Z",
          },
          {
            id: 27,
            username: "andrew",
            email: "andrewjameson@aol.com",
            created_at: "2022-09-04T09:40:55Z",
            updated_at: "2023-01-30T14:18:22Z",
          },
          {
            id: 28,
            username: "ella",
            email: "ellaanderson@live.com",
            created_at: "2023-04-08T13:28:44Z",
            updated_at: "2023-10-15T10:02:36Z",
          },
          {
            id: 29,
            username: "caleb",
            email: "calebroberts123@gmail.com",
            created_at: "2022-03-11T12:57:12Z",
            updated_at: "2023-07-08T17:39:13Z",
          },
          {
            id: 30,
            username: "isla",
            email: "islamitchell@outlook.com",
            created_at: "2022-12-25T09:48:29Z",
            updated_at: "2023-08-27T14:11:59Z",
          },
          {
            id: 31,
            username: "ethan",
            email: "ethanjackson@aol.com",
            created_at: "2021-10-29T07:21:53Z",
            updated_at: "2023-04-12T10:19:37Z",
          },
          {
            id: 32,
            username: "lucy",
            email: "lucyscott@icloud.com",
            created_at: "2023-01-01T08:40:17Z",
            updated_at: "2023-06-03T12:57:41Z",
          },
          {
            id: 33,
            username: "noah",
            email: "noahdavis@live.com",
            created_at: "2022-06-14T12:56:44Z",
            updated_at: "2023-05-11T11:44:03Z",
          },
          {
            id: 34,
            username: "katie",
            email: "katiegreen@aol.com",
            created_at: "2021-12-02T16:20:22Z",
            updated_at: "2023-03-17T14:04:37Z",
          },
          {
            id: 35,
            username: "carter",
            email: "carterharris@gmail.com",
            created_at: "2022-05-01T08:15:36Z",
            updated_at: "2023-07-23T09:52:45Z",
          },
          {
            id: 36,
            username: "gracie",
            email: "gracelawrence@outlook.com",
            created_at: "2023-04-03T09:47:22Z",
            updated_at: "2023-08-18T10:13:12Z",
          },
          {
            id: 37,
            username: "ryan",
            email: "ryanjones123@icloud.com",
            created_at: "2022-02-20T10:12:36Z",
            updated_at: "2023-03-11T12:32:01Z",
          },
          {
            id: 38,
            username: "ella",
            email: "ellaperez@hotmail.com",
            created_at: "2021-11-05T16:58:22Z",
            updated_at: "2023-07-17T14:44:03Z",
          },
          {
            id: 39,
            username: "brian",
            email: "brianrichards@live.com",
            created_at: "2022-08-15T13:25:44Z",
            updated_at: "2023-09-23T08:22:05Z",
          },
          {
            id: 40,
            username: "kelsey",
            email: "kelseyturner@gmail.com",
            created_at: "2023-03-16T11:00:05Z",
            updated_at: "2023-09-08T15:10:38Z",
          },
          {
            id: 41,
            username: "jack",
            email: "jacksmith@outlook.com",
            created_at: "2022-01-03T10:05:16Z",
            updated_at: "2023-04-20T17:21:56Z",
          },
          {
            id: 42,
            username: "chloe",
            email: "chloejameson@aol.com",
            created_at: "2022-07-08T12:09:37Z",
            updated_at: "2023-09-01T10:14:40Z",
          },
          {
            id: 43,
            username: "isaac",
            email: "isaacdavis@icloud.com",
            created_at: "2023-02-16T14:44:30Z",
            updated_at: "2023-08-28T13:30:47Z",
          },
          {
            id: 44,
            username: "oliver",
            email: "oliverclark@live.com",
            created_at: "2021-05-05T13:22:06Z",
            updated_at: "2023-06-01T16:39:18Z",
          },
          {
            id: 45,
            username: "taylor",
            email: "taylorjones123@aol.com",
            created_at: "2022-12-12T08:20:51Z",
            updated_at: "2023-09-16T18:40:22Z",
          },
          {
            id: 46,
            username: "alex",
            email: "alexwilliams@icloud.com",
            created_at: "2022-09-27T14:04:01Z",
            updated_at: "2023-04-11T13:55:06Z",
          },
          {
            id: 47,
            username: "violet",
            email: "violetmiller@hotmail.com",
            created_at: "2021-06-14T11:30:16Z",
            updated_at: "2023-03-07T14:56:33Z",
          },
          {
            id: 48,
            username: "logan",
            email: "loganbrooks@outlook.com",
            created_at: "2023-04-07T09:55:19Z",
            updated_at: "2023-08-24T12:50:22Z",
          },
          {
            id: 49,
            username: "macy",
            email: "macyparker@aol.com",
            created_at: "2022-10-19T12:41:14Z",
            updated_at: "2023-07-12T15:02:51Z",
          },
          {
            id: 50,
            username: "riley",
            email: "rileygray@live.com",
            created_at: "2023-01-13T08:30:29Z",
            updated_at: "2023-10-03T13:25:18Z",
          },
        ];
        setContacts(users);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  return (
    <View>
      <UserMultiSelect
        placeholderText={placeholderText}
        tags={userList}
        options={contacts}
        setTags={setUserList}
        excludedUserList={excludedUserList}
        setExcludedUserList={setExcludedUserList}
      />
    </View>
  );
};

export default UserInviteMultiselect;

const styles = StyleSheet.create({});
