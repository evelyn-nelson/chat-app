import { Platform, Text, View, Dimensions } from "react-native";
import React, { useState, useEffect } from "react";
import { DateOptions } from "@/types/types";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Dropdown } from "react-native-element-dropdown";
import Button from "../Button/Button";

type GroupDateOptionsProps = {
  dateOptions: DateOptions;
  setDateOptions: React.Dispatch<React.SetStateAction<DateOptions>>;
};

type DatePickerMode = "date" | "time" | "datetime" | "countdown";

type ExpirationOptions = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 14 | "month";

const data = [
  { label: "1 day", value: 1 },
  { label: "2 days", value: 2 },
  { label: "3 days", value: 3 },
  { label: "4 days", value: 4 },
  { label: "5 days", value: 5 },
  { label: "6 days", value: 6 },
  { label: "1 week", value: 7 },
  { label: "2 weeks", value: 14 },
  { label: "1 month", value: "month" },
];

const GroupDateOptions = ({
  dateOptions,
  setDateOptions,
}: GroupDateOptionsProps) => {
  const [mode, setMode] = useState<DatePickerMode>("datetime");
  const [show, setShow] = useState(false);
  const [expirationInterval, setExpirationInterval] =
    useState<ExpirationOptions>(1);

  const formatDate = (date: Date | undefined) => {
    if (!date) return { datePart: "Not set", timePart: "" };

    const datePart = date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const timePart = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return { datePart, timePart };
  };

  const onChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined
  ) => {
    const currentDate = selectedDate;
    if (currentDate && expirationInterval != "month") {
      const expirationDate = new Date(currentDate);
      expirationDate.setDate(
        expirationDate.getDate() + Number(expirationInterval)
      );
      setDateOptions({
        startTime: currentDate,
        endTime: expirationDate,
      });
    } else if (currentDate) {
      const expirationDate = new Date(currentDate);
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      setDateOptions({
        startTime: currentDate,
        endTime: expirationDate,
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

  const toggleDatePicker = () => {
    setShow(!show);
  };

  const startFormatted = formatDate(dateOptions?.startTime);
  const endFormatted = formatDate(dateOptions?.endTime);

  return (
    <View className="w-full bg-gray-900 rounded-xl shadow-md p-4 mx-0 my-0 overflow-hidden">
      <View className="mb-4 w-full">
        <View className="flex flex-row mb-2 w-full">
          <Button
            size="base"
            onPress={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);

              setDateOptions({
                startTime: new Date(),
                endTime: tomorrow,
              });
            }}
            text="Today"
            className="mr-2 flex-1 bg-gray-800 rounded-lg"
            textClassName="text-blue-300 font-medium"
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
                startTime: tomorrow,
                endTime: nextDay,
              });
            }}
            text="Tomorrow"
            className="flex-1 bg-gray-800 rounded-lg"
            textClassName="text-blue-300 font-medium"
            border={false}
          />
        </View>
        <Button
          size="base"
          onPress={() => {
            const startTime = new Date();
            const endTime = new Date();
            const dayOfWeek = startTime.getDay();
            switch (dayOfWeek) {
              case 0:
                endTime.setDate(endTime.getDate() + 1);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 1:
                startTime.setDate(startTime.getDate() + 4);
                startTime.setHours(18);
                startTime.setMinutes(0);
                startTime.setSeconds(0);
                endTime.setDate(endTime.getDate() + 7);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 2:
                startTime.setDate(startTime.getDate() + 3);
                startTime.setHours(18);
                startTime.setMinutes(0);
                startTime.setSeconds(0);
                endTime.setDate(endTime.getDate() + 6);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 3:
                startTime.setDate(startTime.getDate() + 2);
                startTime.setHours(18);
                startTime.setMinutes(0);
                startTime.setSeconds(0);
                endTime.setDate(endTime.getDate() + 5);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 4:
                startTime.setDate(startTime.getDate() + 1);
                startTime.setHours(18);
                startTime.setMinutes(0);
                startTime.setSeconds(0);
                endTime.setDate(endTime.getDate() + 4);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 5:
                endTime.setDate(endTime.getDate() + 3);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
              case 6:
                endTime.setDate(endTime.getDate() + 2);
                endTime.setHours(9);
                endTime.setMinutes(0);
                endTime.setSeconds(0);
                break;
            }

            setDateOptions({
              startTime: startTime,
              endTime: endTime,
            });
          }}
          text="This weekend"
          className="bg-gray-800 rounded-lg w-full"
          textClassName="text-blue-300 font-medium"
          border={false}
        />
      </View>
      <Button
        size="base"
        onPress={toggleDatePicker}
        text={show ? "Hide Custom Date" : "Custom Date & Time"}
        className="bg-blue-600 rounded-lg mb-4 w-full"
        textClassName="text-white font-medium"
        border={false}
      />
      <View className="bg-gray-800 rounded-lg p-3 mb-2 w-full h-min-[80]">
        <View className="mb-1">
          <Text className="text-sm text-gray-400 mb-1">Starts:</Text>
          <View className="flex flex-row">
            <Text className="text-base font-medium text-gray-200">
              {startFormatted.datePart} {startFormatted.timePart}
            </Text>
          </View>
        </View>

        <View>
          <Text className="text-sm text-gray-400 mb-1">Ends:</Text>
          <View className="flex flex-row">
            <Text className="text-base font-medium text-gray-200">
              {endFormatted.datePart} {endFormatted.timePart}
            </Text>
          </View>
        </View>
      </View>
      {show && (
        <View className="mt-2 bg-gray-800 rounded-lg p-3 w-full">
          <Text className="text-sm font-medium text-gray-300 mb-2">
            Select Start Date & Time
          </Text>
          {Platform.OS != "web" ? (
            <View className="w-full items-center">
              <DateTimePicker
                testID="dateTimePicker"
                value={dateOptions?.startTime ?? new Date()}
                mode={mode}
                is24Hour={true}
                onChange={onChange}
                themeVariant="dark"
              />
            </View>
          ) : (
            <View className="bg-gray-700 rounded-lg p-2 w-full">
              <input
                type={"datetime-local"}
                className="p-2 bg-gray-700 text-white border border-gray-600 rounded-md w-full mb-3"
                value={convertToDateTimeLocalString(
                  dateOptions?.startTime ?? new Date()
                )}
                onChange={(event) => {
                  onChange(
                    {} as DateTimePickerEvent,
                    new Date(event.target.value)
                  );
                }}
                style={{ colorScheme: "dark" }}
              />
            </View>
          )}

          <Text className="text-sm font-medium text-gray-300 mb-2 mt-3">
            Set Duration
          </Text>
          <View className="w-full">
            <Dropdown
              data={data}
              placeholder="Choose duration"
              value={expirationInterval}
              onChange={(item) => setExpirationInterval(item.value)}
              labelField={"label"}
              valueField={"value"}
              style={{
                height: 50,
                backgroundColor: "#374151",
                borderColor: "#4B5563",
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 8,
                width: "100%",
                maxWidth: "100%", // Add maxWidth to prevent overflow
              }}
              placeholderStyle={{
                fontSize: 14,
                color: "#9CA3AF",
              }}
              selectedTextStyle={{
                fontSize: 14,
                color: "#E5E7EB",
              }}
              itemTextStyle={{
                color: "#E5E7EB",
              }}
              containerStyle={{
                backgroundColor: "#374151",
                borderColor: "#4B5563",
                borderWidth: 1,
                borderRadius: 8,
                width: "100%",
                maxWidth: "65%",
              }}
              activeColor="#1E293B"
              maxHeight={200}
              itemContainerStyle={{
                width: "100%",
                justifyContent: "space-between",
                paddingHorizontal: 8, // Add padding to match
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default GroupDateOptions;
