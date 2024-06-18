import { Modal } from "antd";
import { Outlet } from "react-router-dom";
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
import { useEvaluate } from "@ensembleui/react-framework";
import { isEmpty, isString, omit, pick } from "lodash-es";
import { getComponentStyles } from "../shared/styles";

interface ModalProps {
  title?: string | React.ReactNode;
  maskClosable?: boolean;
  mask?: boolean;
  hideCloseIcon?: boolean;
  hideFullScreenIcon?: boolean;
  onClose?: () => void;
  position?: "top" | "right" | "bottom" | "left" | "center";
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

export const ModalWrapper: React.FC<PropsWithChildren> = () => {
  const [modalState, setModalState] = useState<ModalState[]>([]);
  const [modalDimensions, setModalDimensions] = useState<ModalDimensions[]>([]);
  const [isFullScreen, setIsFullScreen] = useState<boolean[]>([]);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [newModal, setNewModal] = useState<{
    content: React.ReactNode;
    options: ModalProps;
    isDialog: boolean;
    context?: Record<string, unknown>;
  }>();
  const [isDialogSet, setIsDialogSet] = useState<boolean>(false);
  const evaluatedOptions = useEvaluate(
    newModal?.options as Record<string, unknown>,
    {
      context: newModal?.context,
      refreshExpressions: true,
    },
  );

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
          content: newModal?.content,
          options: evaluatedOptions,
          key: oldModalState.length
            ? oldModalState[oldModalState.length - 1].key + 1
            : 0,
          isDialog: Boolean(newModal?.isDialog),
        },
      ]);
      setModalDimensions((oldModalDimensions) => [
        ...oldModalDimensions,
        { width: 0, height: 0 },
      ]);
      setIsFullScreen((oldIsFullScreen) => [...oldIsFullScreen, false]);
      setIsDialogSet(true);
    }
  }, [evaluatedOptions, isDialogSet, newModal]);

  const openModal = (
    content: React.ReactNode,
    options: ModalProps,
    isDialog = false,
    modalContext?: Record<string, unknown>,
  ): void => {
    if (!isDialog && modalState.length > 0) {
      // hide the last modal
      setModalState((oldModalState) => [
        ...oldModalState.slice(0, -1),
        {
          ...oldModalState[oldModalState.length - 1],
          visible: false,
        },
      ]);
    }

    setNewModal({
      content,
      options: omit(options, [!isString(options.title) ? "title" : ""]),
      isDialog,
      context: modalContext,
    });
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

  const getCustomStyles = (options: ModalProps, index: number): string =>
    `
      .ant-modal-root .ant-modal-centered .ant-modal {
        top: unset;
      }
      .ensemble-modal-${index} {
        max-height: 100vh;
        max-width: 100vw;
      }
      .ensemble-modal-${index} > div {
        height: ${options.height || "auto"};
      }
      .ensemble-modal-${index} .ant-modal-content {
        display: flex;
        flex-direction: column;
        ${
          getComponentStyles(
            "",
            omit(options, [
              "width",
              "position",
              "top",
              "left",
              "bottom",
              "right",
            ]) as React.CSSProperties,
          ) as string
        }
        ${options.showShadow === false ? "box-shadow: none !important;" : ""}
      }
      .ensemble-modal-${index} .ant-modal-body {
        height: 100%;
        overflow-y: auto;
      }
    `;

  const getFullScreenStyles = (index: number): string => `
    .ensemble-modal-${index} .ant-modal-content {
      height: 100vh;
      width: 100vw;
      margin: 0;
      inset: 0;
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
      <Outlet />

      {modalState.map((modal, index) => {
        if (!modal.visible) {
          return null;
        }
        const { options } = modal;
        const modalContent = (
          <>
            <style>{getCustomStyles(options, index)}</style>
            {isFullScreen[index] && <style>{getFullScreenStyles(index)}</style>}
            <Modal
              centered={!isFullScreen[index]}
              className={`ensemble-modal-${index}`}
              closable={false}
              footer={null}
              key={modal.key}
              mask={options.mask}
              maskClosable={options.maskClosable}
              onCancel={(): void => closeModal(index)}
              open={modal.visible}
              style={{
                ...(options.position === "top" && {
                  top: 0,
                  left: `calc(50% - ${modalDimensions[index].width / 2}px)`,
                }),
                ...(options.position === "bottom" && {
                  bottom: 0,
                  left: `calc(50% - ${modalDimensions[index].width / 2}px)`,
                }),
                ...(options.position === "left" && {
                  left: 0,
                  top: `calc(50% - ${modalDimensions[index].height / 2}px)`,
                }),
                ...(options.position === "right" && {
                  right: 0,
                  top: `calc(50% - ${modalDimensions[index].height / 2}px)`,
                }),
                ...(options.position === "center" && {
                  top: "50% !important",
                  left: "50% !important",
                  transform: "translate(-50%, -50%) !important",
                }),
                ...(options.position && {
                  position: [
                    "top",
                    "right",
                    "bottom",
                    "left",
                    "center",
                  ].includes(options.position)
                    ? "absolute"
                    : (options.position as React.CSSProperties["position"]),
                }),
                ...(options.horizontalOffset && {
                  left: `calc(${(options.horizontalOffset * 100) / 2}% ${
                    options.horizontalOffset < 0 ? "+" : "-"
                  } ${modalDimensions[index].width / 2}px)`,
                }),
                ...(options.verticalOffset && {
                  top: `calc(${(options.verticalOffset * 100) / 2}% ${
                    options.verticalOffset < 0 ? "+" : "-"
                  } ${modalDimensions[index].height / 2}px)`,
                }),
                ...(isFullScreen[index]
                  ? {
                      height: "100vh",
                      width: "100vw",
                      margin: 0,
                      inset: 0,
                    }
                  : (getComponentStyles(
                      "",
                      pick(options, [
                        "height",
                        "width",
                        "top",
                        "right",
                        "bottom",
                        "left",
                      ]) as React.CSSProperties,
                      false,
                    ) as React.CSSProperties)),
              }}
              title={getTitleElement(modal.options, index)}
              width={modal.options.width || "auto"}
            >
              <div
                ref={contentRef}
                style={{
                  height: "100%",
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
