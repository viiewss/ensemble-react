import { useMemo } from "react";
import { Col } from "antd";
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
import type { FlexboxProps } from "../shared/types";
import { getColor, getCrossAxis, getMainAxis } from "../shared/styles";

export const Column: React.FC<FlexboxProps> = (props) => {
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
    <Col
      className={values?.styles?.names}
      ref={rootRef}
      style={{
        ...values?.styles,
        flexDirection: "column",
        justifyContent: props.mainAxis && getMainAxis(props.mainAxis),
        alignItems: props.crossAxis && getCrossAxis(props.crossAxis),
        margin: props.margin,
        padding: props.padding,
        gap: props.gap,
        borderRadius: props.styles?.borderRadius,
        borderWidth: props.styles?.borderWidth,
        borderColor: props.styles?.borderColor
          ? getColor(props.styles.borderColor)
          : undefined,
        borderStyle: props.styles?.borderWidth ? "solid" : undefined,
        display: "flex",
        minHeight: "unset",
        ...(get(props, "styles") as object),
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
    </Col>
  );
};

WidgetRegistry.register("Column", Column);
