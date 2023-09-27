import { useRegisterBindings } from "framework";
import { useState } from "react";
import { Typography } from "antd";
import { WidgetRegistry } from "../registry";
import type { BaseTextProps } from "../util/types";
import { getTextAlign } from "../util/utils";

export type TextProps = {
  // to be added more
} & BaseTextProps;

export const Text: React.FC<TextProps> = (props) => {
  const [text, setText] = useState(props.text);
  const { values } = useRegisterBindings({ ...props, text }, props.id, {
    setText,
  });
  return (
    <Typography.Text style={{ textAlign: getTextAlign(props.textAlign) }}>
      {values.text}
    </Typography.Text>
  );
};

WidgetRegistry.register("Text", Text);
