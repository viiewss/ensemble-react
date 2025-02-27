import React, { useState } from "react";
import { useRegisterBindings } from "@ensembleui/react-framework";
import { WidgetRegistry } from "../registry";
import type { IconProps } from "../shared/types";
import { getColor, getIcon } from "../shared/styles";
import { useEnsembleAction } from "../runtime/hooks/useEnsembleAction";

const widgetName = "Icon";

export const Icon: React.FC<IconProps> = ({
  onTap,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [color, setColor] = useState(props.color);
  const [name, setName] = useState(props.name);
  const [backgroundColor, setBackgroundColor] = useState(
    props.styles?.backgroundColor,
  );
  const [isMouseOver, setIsMouseOver] = useState(false);
  const onTapActionCallback = useEnsembleAction(onTap);
  const onMouseEnterAction = useEnsembleAction(onMouseEnter);
  const onMouseLeaveAction = useEnsembleAction(onMouseLeave);

  const { values } = useRegisterBindings(
    { ...props, color, name, backgroundColor, widgetName },
    props.id,
    {
      setColor,
      setName,
      setBackgroundColor,
    },
  );
  const IconComponent = getIcon(values?.name ? values.name : "");
  if (!IconComponent) {
    return null;
  }
  const handleMouseOver = (event: React.MouseEvent<SVGSVGElement>): void => {
    const { clientX, clientY } = event;
    if (!isMouseOver) {
      setIsMouseOver(true);
      onMouseEnterAction?.callback({
        location: { x: clientX, y: clientY },
      });
    }
  };
  const handleMouseLeave = (): void => {
    // Check if the mouse has left the Icon component
    onMouseLeaveAction?.callback();
    setIsMouseOver(false);
  };
  return (
    <IconComponent
      className={values?.styles?.names}
      onClick={(): unknown => onTapActionCallback?.callback()}
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      sx={{
        cursor: onTap ? "pointer" : "auto",
        ...values?.styles,
        color: values?.color && getColor(String(values.color)),
        fontSize: props.size,
        backgroundColor: `${
          values?.styles?.backgroundColor
            ? values.styles.backgroundColor
            : "transparent"
        }`,
        padding: `${
          values?.styles?.padding ? `${values.styles.padding}px` : "0px"
        }`,
        margin: `${
          values?.styles?.margin ? `${values.styles.margin}px` : "0px"
        }`,
        borderRadius: `${
          values?.styles?.borderRadius
            ? `${values.styles.borderRadius}px`
            : "0px"
        }`,
        borderWidth: `${
          values?.styles?.borderWidth ? `${values.styles.borderWidth}px` : "0px"
        }`,
        borderColor: values?.styles?.borderColor
          ? getColor(String(values.styles.borderColor))
          : undefined,
        borderStyle: values?.styles?.borderWidth ? "solid" : undefined,
        ...(values?.styles?.visible === false
          ? { display: "none" }
          : undefined),
      }}
    />
  );
};

WidgetRegistry.register(widgetName, Icon);
