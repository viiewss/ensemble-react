import { useMemo } from "react";
import { Row as AntRow } from "antd";
import { get, indexOf, keys } from "lodash-es";
import {
  type CustomScope,
  CustomScopeProvider,
  useRegisterBindings,
  useTemplateData,
  Expression,
} from "@ensembleui/react-framework";
import { WidgetRegistry } from "../registry";
import { EnsembleRuntime } from "../runtime";
import { getColor, getCrossAxis, getMainAxis } from "../shared/styles";
import type { FlexboxProps } from "../shared/types";

export const Row: React.FC<FlexboxProps> = (props) => {
  const itemTemplate = props["item-template"];
  const childrenFirst =
    indexOf(keys(props), "children") < indexOf(keys(props), "item-template");

  const { values, rootRef } = useRegisterBindings({ ...props }, props.id);
  const { namedData } = useTemplateData({
    data: itemTemplate?.data as Expression<object>,
    name: itemTemplate?.name,
  });

  const renderedChildren = useMemo(() => {
    return props.children ? EnsembleRuntime.render(props?.children) : null;
  }, [props.children]);

  return (
    <AntRow
      className={values?.styles?.names}
      ref={rootRef}
      style={{
        ...values?.styles,
        justifyContent: props.mainAxis && getMainAxis(props.mainAxis),
        alignItems: props.crossAxis && getCrossAxis(props.crossAxis),
        margin: props.margin,
        padding: props.padding,
        gap: props.gap,
        backgroundColor: props.styles?.backgroundColor
          ? getColor(props.styles.backgroundColor)
          : undefined,
        borderRadius: props.styles?.borderRadius,
        borderWidth: props.styles?.borderWidth,
        borderColor: props.styles?.borderColor
          ? getColor(props.styles.borderColor)
          : undefined,
        borderStyle: props.styles?.borderWidth ? "solid" : undefined,
        ...(get(props, "styles") as object),
        maxWidth: props.maxWidth ?? "100%",
        minWidth: props.minWidth,
        flexDirection: "row",
        flexFlow: "unset",
        flexGrow: "unset",
      }}
    >
      {childrenFirst && renderedChildren}
      {namedData?.map((n, index) => (
        <CustomScopeProvider key={index} value={n as CustomScope}>
          {itemTemplate?.template &&
            EnsembleRuntime.render([itemTemplate.template])}
        </CustomScopeProvider>
      ))}
      {!childrenFirst && renderedChildren}
    </AntRow>
  );
};

WidgetRegistry.register("Row", Row);
