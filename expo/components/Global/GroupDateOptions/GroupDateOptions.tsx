import { Platform, Text, View } from "react-native";
import React, { SetStateAction, useState } from "react";
import { DateOptions } from "@/types/types";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Dropdown } from "react-native-element-dropdown";
import Button from "../Button/Button";

type GroupDateOptionsProps = {
  dateOptions: DateOptions | undefined;
  setDateOptions: React.Dispatch<React.SetStateAction<DateOptions | undefined>>;
};

type DatePickerMode = "date" | "time" | "datetime" | "countdown";

type ExpirationOptions = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 14 | "month";

const data = [
  {
    label: "1 day",
    value: 1,
  },
  {
    label: "2 days",
    value: 2,
  },
  {
    label: "3 days",
    value: 3,
  },
  {
    label: "4 days",
    value: 4,
  },
  {
    label: "5 days",
    value: 5,
  },
  {
    label: "6 days",
    value: 6,
  },
  {
    label: "1 week",
    value: 7,
  },
  {
    label: "2 weeks",
    value: 14,
  },
  {
    label: "1 month",
    value: "month",
  },
];

const GroupDateOptions = ({
  dateOptions,
  setDateOptions,
}: GroupDateOptionsProps) => {
  const [mode, setMode] = useState<DatePickerMode>("datetime");
  const [show, setShow] = useState(false);
  const [expirationInterval, setExpirationInterval] =
    useState<ExpirationOptions>(1);

  const onChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined
  ) => {
    const currentDate = selectedDate;
    setShow(false);
    if (currentDate && expirationInterval != "month") {
      const expirationDate = new Date(currentDate);
      expirationDate.setDate(
        expirationDate.getDate() + Number(expirationInterval)
      );
      setDateOptions({
        startDate: currentDate,
        endDate: expirationDate,
      });
    } else if (currentDate) {
      const expirationDate = new Date(currentDate);
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      setDateOptions({
        startDate: currentDate,
        endDate: expirationDate,
      });
    }
  };

  const showMode = (currentMode: DatePickerMode) => {
    setShow(true);
    setMode(currentMode);
  };

  const showDatepicker = () => {
    showMode("datetime");
  };

  const convertToDateTimeLocalString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  return (
    <View className="border border-blue-900 p-2">
      <View className="flex flex-col">
        <View className="flex flex-row">
          <Button
            size="base"
            onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              setDateOptions({
                startDate: new Date(),
                endDate: tomorrow,
              });
            }}
            text="Today"
            className="m-1 flex-1"
            border={false}
          />
          <Button
            size="base"
            onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              const nextDay = new Date();
              nextDay.setDate(nextDay.getDate() + 2);

              setDateOptions({
                startDate: tomorrow,
                endDate: nextDay,
              });
            }}
            text="Tomorrow"
            className="m-1 flex-1"
            border={false}
          />
        </View>
        <Button
          size="base"
          onPress={() => {
            const startDate = new Date();
            const endDate = new Date();
            const dayOfWeek = startDate.getDay();
            switch (dayOfWeek) {
              case 0:
                endDate.setDate(endDate.getDate() + 1);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 1:
                startDate.setDate(startDate.getDate() + 4);
                startDate.setHours(18);
                startDate.setMinutes(0);
                startDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 7);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 2:
                startDate.setDate(startDate.getDate() + 3);
                startDate.setHours(18);
                startDate.setMinutes(0);
                startDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 3:
                startDate.setDate(startDate.getDate() + 2);
                startDate.setHours(18);
                startDate.setMinutes(0);
                startDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 5);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 4:
                startDate.setDate(startDate.getDate() + 1);
                startDate.setHours(18);
                startDate.setMinutes(0);
                startDate.setSeconds(0);
                endDate.setDate(endDate.getDate() + 4);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 5:
                endDate.setDate(endDate.getDate() + 3);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
              case 6:
                endDate.setDate(endDate.getDate() + 2);
                endDate.setHours(9);
                endDate.setMinutes(0);
                endDate.setSeconds(0);
                break;
            }

            setDateOptions({
              startDate: startDate,
              endDate: endDate,
            });
          }}
          text="This weekend"
          className="m-1"
          border={false}
        />
      </View>
      <Button
        size="base"
        onPress={showDatepicker}
        text="Show date picker!"
        className="m-1"
        border={false}
      />
      <Text>selected: {dateOptions?.startDate?.toLocaleString()}</Text>
      <Text>expire: {dateOptions?.endDate?.toLocaleString()}</Text>
      {show && (
        <View>
          {Platform.OS != "web" ? (
            <DateTimePicker
              testID="dateTimePicker"
              value={dateOptions?.startDate ?? new Date()}
              mode={mode}
              is24Hour={true}
              onChange={onChange}
            />
          ) : (
            <input
              type={"datetime-local"}
              value={convertToDateTimeLocalString(
                dateOptions?.startDate ?? new Date()
              )}
              onChange={(event) => {
                onChange(
                  {} as DateTimePickerEvent,
                  new Date(event.target.value)
                );
              }}
            />
          )}
          <Dropdown
            data={data}
            placeholder="Choose expiration interval"
            value={expirationInterval}
            onChange={(item) => setExpirationInterval(item.value)}
            labelField={"label"}
            valueField={"value"}
          />
        </View>
      )}
    </View>
  );
};

export default GroupDateOptions;
