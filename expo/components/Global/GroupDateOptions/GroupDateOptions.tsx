import { Button, Text, View } from "react-native";
import React, { SetStateAction, useState } from "react";
import { DateOptions } from "@/types/types";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

type GroupDateOptionsProps = {
  dateOptions: DateOptions | undefined;
  setDateOptions: React.Dispatch<React.SetStateAction<DateOptions | undefined>>;
};

type DatePickerMode = "date" | "time" | "datetime" | "countdown";

type ExpirationOptions = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 14 | "month";

const GroupDateOptions = ({
  dateOptions,
  setDateOptions,
}: GroupDateOptionsProps) => {
  const [mode, setMode] = useState<DatePickerMode>("datetime");
  const [show, setShow] = useState(false);
  const [expirationInterval, setExpirationInterval] =
    useState<ExpirationOptions>("month");

  const onChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined
  ) => {
    const currentDate = selectedDate;
    setShow(false);
    if (currentDate && expirationInterval != "month") {
      console.log("normal");
      console.log(expirationInterval);
      console.log(currentDate.toLocaleDateString());
      const expirationDate = new Date(currentDate);
      console.log(expirationDate.toLocaleDateString());
      expirationDate.setDate(
        expirationDate.getDate() + Number(expirationInterval)
      );
      console.log(expirationDate.toLocaleDateString());
      setDateOptions({
        startDate: currentDate,
        endDate: expirationDate,
      });
    } else if (currentDate) {
      console.log("month");
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

  return (
    <View>
      <Button onPress={showDatepicker} title="Show date picker!" />
      <Text>selected: {dateOptions?.startDate?.toLocaleString()}</Text>
      <Text>expire: {dateOptions?.endDate?.toLocaleString()}</Text>
      {show && (
        <View>
          <DateTimePicker
            testID="dateTimePicker"
            value={dateOptions?.startDate ?? new Date()}
            mode={mode}
            is24Hour={true}
            onChange={onChange}
          />
          <Picker
            selectedValue={expirationInterval}
            onValueChange={(item) => setExpirationInterval(item)}
          >
            <Picker.Item label="1 day" value={1} />
            <Picker.Item label="2 days" value={2} />
            <Picker.Item label="3 days" value={3} />
            <Picker.Item label="4 days" value={4} />
            <Picker.Item label="5 days" value={5} />
            <Picker.Item label="6 days" value={6} />
            <Picker.Item label="1 week" value={7} />
            <Picker.Item label="2 weeks" value={14} />
            <Picker.Item label="1 month" value={"month"} />
          </Picker>
        </View>
      )}
    </View>
  );
};

export default GroupDateOptions;
