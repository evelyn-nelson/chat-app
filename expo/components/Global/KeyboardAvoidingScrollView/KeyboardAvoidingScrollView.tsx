import React from "react";
import { View, ScrollViewProps } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

interface Props {
  children: React.ReactNode;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  keyboardOffset?: number;
}

const KeyboardAvoidingScrollView: React.FC<Props> = ({
  children,
  contentContainerStyle,
  keyboardOffset = 50,
}) => {
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingBottom: 50,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      extraScrollHeight={keyboardOffset}
    >
      <View>{children}</View>
    </KeyboardAwareScrollView>
  );
};

export default KeyboardAvoidingScrollView;
