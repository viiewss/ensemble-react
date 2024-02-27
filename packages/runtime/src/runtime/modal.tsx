import { Modal } from "antd";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import { CloseOutlined } from "@ant-design/icons";
import { getComponentStyles } from "../shared/styles";
import { useEvaluate } from "@ensembleui/react-framework";
import { isEmpty, omit } from "lodash-es";

interface ModalProps {
  title?: string | React.ReactNode;
  maskClosable?: boolean;
  mask?: boolean;
  hideCloseIcon?: boolean;
  hideFullScreenIcon?: boolean;
  onClose?: () => void;
  position?: "top" | "right" | "bottom" | "left";
  height?: string;
  width?: string | number;
  margin?: string;
  padding?: string;
  backgroundColor?: string;
  horizontalOffset?: number;
  verticalOffset?: number;
  showShadow?: boolean;
}

interface ModalContextProps {
  openModal: (
    content: React.ReactNode,
    options: ModalProps,
    isDialog?: boolean,
    context?: Record<string, unknown>,
  ) => void;
  closeAllModals: () => void;
}

export const ModalContext = createContext<ModalContextProps | undefined>(
  undefined,
);

interface ModalState {
  visible: boolean;
  content: React.ReactNode;
  options: ModalProps;
  key: number;
  isDialog: boolean;
}

interface ModalDimensions {
  width: number;
  height: number;
}

export const ModalWrapper: React.FC<PropsWithChildren> = ({ children }) => {
  const [modalState, setModalState] = useState<ModalState[]>([]);
  const [modalDimensions, setModalDimensions] = useState<ModalDimensions[]>([]);
  const [isFullScreen, setIsFullScreen] = useState<boolean[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const [context, setContext] = useState<unknown>();
  const [newContent, setNewContent] = useState<React.ReactNode>();
  const [newOptions, setNewOptions] = useState<Record<string, unknown>>({});
  const [isDialog, setIsDialog] = useState<boolean>(false);
  const [isDialogSet, setIsDialogSet] = useState<boolean>(false);
  const evaluatedOptions = useEvaluate(newOptions, { context });

  useLayoutEffect(() => {
    if (modalState.length > 0 && !isFullScreen[isFullScreen.length - 1])
      setModalDimensions((oldModalDimensions) => [
        ...oldModalDimensions.slice(0, -1),
        {
          width: contentRef.current?.offsetParent?.clientWidth || 0, // offsetParent is the .ant-modal-content
          height: contentRef.current?.offsetParent?.clientHeight || 0,
        },
      ]);
  }, [modalState, isFullScreen, contentRef]);

  useEffect(() => {
    if (!isEmpty(evaluatedOptions) && !isDialogSet) {
      // add a new modal to the end of the arrays
      setModalState((oldModalState) => [
        ...oldModalState,
        {
          visible: true,
          content: newContent,
          options: evaluatedOptions,
          key: oldModalState.length
            ? oldModalState[oldModalState.length - 1].key + 1
            : 0,
          isDialog,
        },
      ]);
      setModalDimensions((oldModalDimensions) => [
        ...oldModalDimensions,
        { width: 0, height: 0 },
      ]);
      setIsFullScreen((oldIsFullScreen) => [...oldIsFullScreen, false]);
      setIsDialogSet(true);
    }
  }, [evaluatedOptions, newContent, isDialogSet, newContent, isDialog]);

  const openModal = (
    content: React.ReactNode,
    options: ModalProps,
    isADialog = false,
    modalContext?: Record<string, unknown>,
  ): void => {
    if (!isADialog && modalState.length > 0) {
      // hide the last modal
      setModalState((oldModalState) => [
        ...oldModalState.slice(0, -1),
        {
          ...oldModalState[oldModalState.length - 1],
          visible: false,
        },
      ]);
      return;
    }

    setContext(modalContext);
    setNewContent(content);
    setNewOptions(options as Record<string, unknown>);
    setIsDialog(isADialog);
    setIsDialogSet(false);
  };

  const closeModal = (index?: number): void => {
    if (index !== undefined) {
      modalState[index].options.onClose?.();
    }

    setModalState((oldModalState) =>
      oldModalState.filter((_, i) => i !== index),
    );
    setModalDimensions((oldModalDimensions) =>
      oldModalDimensions.filter((_, i) => i !== index),
    );
    setIsFullScreen((oldIsFullScreen) =>
      oldIsFullScreen.filter((_, i) => i !== index),
    );
  };

  const closeAllModals = (): void => {
    for (let i = modalState.length - 1; i >= 0; i--) {
      if (!modalState[i].isDialog) break;
      else closeModal(i);
    }
  };

  const getPositionSelector = (
    modalWidth: number,
    modalHeight: number,
    isFullHeight = false,
  ): Record<string, string> => {
    return {
      top: `
        top: 0 !important;
        left: calc(50% - ${modalWidth / 2}px) !important;
      `,
      right: `
        right: 0 !important;
        ${
          isFullHeight
            ? ""
            : `top: calc(50% - ${modalHeight / 2}px) !important;`
        }
      `,
      bottom: `
        bottom: 0 !important;
        right: calc(50% - ${modalWidth / 2}px) !important;
      `,
      left: `
        left: 0 !important;
        ${
          isFullHeight
            ? ""
            : `top: calc(50% - ${modalHeight / 2}px) !important;`
        }
      `,
      center: `
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
      `,
    };
  };

  const getPositionStyles = (options: ModalProps, index: number): string =>
    `
      .ensemble-modal-${index} {
        ${
          options.position
            ? getPositionSelector(
                modalDimensions[index].width,
                modalDimensions[index].height,
                options.height?.includes("100"),
              )[options.position]
            : ""
        }
        ${
          options.horizontalOffset
            ? `left: calc(${(options.horizontalOffset * 100) / 2}% + ${
                modalDimensions[index].width / 2
              }px) !important;`
            : ""
        }
        ${
          options.verticalOffset
            ? `top: calc(${(options.verticalOffset * 100) / 2}% + ${
                modalDimensions[index].height / 2
              }px) !important;`
            : ""
        }
      }
    `;

  const getCustomStyles = (
    options: ModalProps,
    index: number,
    isFullScreenActive: boolean,
  ): string =>
    `
      .ant-modal-root .ant-modal-centered .ant-modal {
        top: unset;
        max-width: 100%;
      }
      .ensemble-modal-${index} .ant-modal-content {
        ${getComponentStyles(
          "",
          omit(options, ["height"]) as React.CSSProperties,
          false,
        )}
        ${options.showShadow === false ? "box-shadow: none !important;" : ""}
      }
      .ensemble-modal-${index} .ant-modal-body {
        height: ${
          isFullScreenActive || options.height?.includes("100")
            ? `calc(100vh - ${
                options?.title ||
                options?.hideFullScreenIcon === false ||
                options?.hideCloseIcon === false
                  ? // subtract title bar height (8px is its margin-bottom)
                    `8px - ${titleRef?.current?.offsetHeight || 0}`
                  : 0
              }px - ${
                getSumTopBottomPadding(options?.padding || "0px") // subtract content padding
              }px)`
            : options.height || "auto"
        };
      }
    `;

  const getFullScreenStyles = (index: number): string => `
    .ensemble-modal-${index}.ant-modal, .ensemble-modal-${index}.ant-modal .ant-modal-content {
      height: 100vh;
      width: 100vw;
      margin: 0;
      top: 0;
    }
  `;

  const iconStyles = {
    color: "rgba(0, 0, 0, 0.45)",
    cursor: "pointer",
  };

  const getFullScreenIcon = (index: number): React.ReactNode =>
    isFullScreen[index] ? (
      <CloseFullscreenIcon
        onClick={(): void =>
          setIsFullScreen((oldIsFullScreen) => {
            const newIsFullScreen = [...oldIsFullScreen];
            newIsFullScreen[index] = false;
            return newIsFullScreen;
          })
        }
        style={iconStyles}
      />
    ) : (
      <OpenInFullIcon
        onClick={(): void =>
          setIsFullScreen((oldIsFullScreen) => {
            const newIsFullScreen = [...oldIsFullScreen];
            newIsFullScreen[index] = true;
            return newIsFullScreen;
          })
        }
        style={iconStyles}
      />
    );

  const getTitleElement = (
    options: ModalProps,
    index: number,
  ): React.ReactNode =>
    !options.title &&
    options.hideFullScreenIcon === true &&
    options.hideCloseIcon === true ? null : (
      <div
        ref={titleRef}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {options.hideFullScreenIcon ? null : getFullScreenIcon(index)}
        {options.title}
        {options.hideCloseIcon ? null : (
          <CloseOutlined
            onClick={(): void =>
              setModalState((oldModalState) => [
                ...oldModalState.slice(0, -1),
                { ...oldModalState[oldModalState.length - 1], visible: false },
              ])
            }
            style={iconStyles}
          />
        )}
      </div>
    );

  return (
    <ModalContext.Provider
      value={{
        openModal,
        closeAllModals,
      }}
    >
      {children}

      {modalState.map((modal, index) => {
        if (!modal.visible) {
          return null;
        }

        const modalContent = (
          <>
            <style>
              {getCustomStyles(modal.options, index, isFullScreen[index])}
            </style>
            <style>
              {isFullScreen[index]
                ? getFullScreenStyles(index)
                : getPositionStyles(modal.options, index)}
            </style>
            <Modal
              centered={!isFullScreen[index]}
              className={`ensemble-modal-${index}`}
              closable={false}
              footer={null}
              key={modal.key}
              mask={modal.options.mask}
              maskClosable={modal.options.maskClosable}
              onCancel={(): void => closeModal(index)}
              open={modal.visible}
              style={{
                ...(modal.options.position ? { position: "absolute" } : {}),
                margin: (!isFullScreen[index] && modal.options.margin) || 0,
              }}
              title={getTitleElement(modal.options, index)}
              width={modal.options.width || "auto"}
            >
              <div
                ref={contentRef}
                style={{
                  height: "100%",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {modal.content}
              </div>
            </Modal>
          </>
        );

        return createPortal(modalContent, document.body);
      })}
    </ModalContext.Provider>
  );
};

function getSumTopBottomPadding(cssPadding: string) {
  const paddings = cssPadding.trim().split(" ");

  if (paddings.length <= 2) {
    const paddingValue = parseInt(paddings[0], 10);
    return paddingValue * 2;
  } else if (paddings.length === 3) {
    const topPadding = parseInt(paddings[0], 10);
    const bottomPadding = parseInt(paddings[2], 10);
    return topPadding + bottomPadding;
  } else if (paddings.length === 4) {
    const topPadding = parseInt(paddings[0], 10);
    const bottomPadding = parseInt(paddings[2], 10);
    return topPadding + bottomPadding;
  } else {
    return 0;
  }
}
