import { Provider, useAtom, useAtomValue, useSetAtom } from "jotai";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { clone, debounce, merge } from "lodash-es";
import { useHydrateAtoms } from "jotai/utils";
import {
  appAtom,
  defaultScreenContext,
  locationAtom,
  screenAtom,
  screenDataAtom,
  themeAtom,
  userAtom,
  useDeviceData,
} from "../state";
import type {
  ApplicationContextDefinition,
  ScreenContextActions,
  ScreenContextDefinition,
} from "../state";
import type { Response, WebSocketConnection } from "../data";
import type { EnsembleScreenModel } from "../shared/models";
import { useApplicationContext } from "./useApplicationContext";
import { CustomThemeContext } from "./useThemeContext";

interface ScreenContextProps {
  screen: EnsembleScreenModel;
  context?: Partial<ScreenContextDefinition>;
}

type ScreenContextProviderProps = React.PropsWithChildren<ScreenContextProps>;

export const ScreenContextProvider: React.FC<ScreenContextProviderProps> = ({
  screen,
  context,
  children,
}) => {
  const [location] = useAtom(locationAtom);
  const appContext = useApplicationContext();

  if (!appContext) {
    throw new Error("Missing application context for screen!");
  }

  return (
    <Provider key={screen.name}>
      <HydrateAtoms
        appContext={appContext}
        screenContext={
          merge(
            {},
            defaultScreenContext,
            {
              app: appContext.application,
              model: screen,
              inputs: Object.fromEntries(
                location.searchParams?.entries() ?? [],
              ),
            },
            context,
          ) as ScreenContextDefinition
        }
      >
        {children}
      </HydrateAtoms>
    </Provider>
  );
};

const HydrateAtoms: React.FC<
  React.PropsWithChildren<{
    appContext: ApplicationContextDefinition;
    screenContext: ScreenContextDefinition;
  }>
> = ({ appContext, screenContext, children }) => {
  const themeScope = useContext(CustomThemeContext);

  // initialising on state with prop on render here
  useHydrateAtoms([[screenAtom, screenContext]]);
  useHydrateAtoms(
    [
      [appAtom, appContext],
      [themeAtom, themeScope.theme],
      [userAtom, appContext.user],
    ],
    {
      dangerouslyForceHydrate: true,
    },
  );

  // initiate device resizer observer
  useDeviceObserver();

  return <>{children}</>;
};

/**
 * @deprecated Re-renders component each time screen context changes which
 * can be very expensive. Only used for rare cases where full context is
 * needed.
 *
 * Consider using `createBinding` instead which will construct a custom scope
 * of just the referenced dependencies in the expression/script.
 *
 * @returns the full state of the current screen
 */
export const useScreenContext = ():
  | (ScreenContextDefinition & Pick<ScreenContextActions, "setData">)
  | null => {
  const screenContext = useAtomValue(screenAtom);
  const setDataAtom = useSetAtom(screenDataAtom);
  const setData = useCallback(
    (name: string, response: Response | WebSocketConnection) => {
      const data = screenContext.data;
      data[name] = response;
      setDataAtom(clone(data));
    },
    [screenContext.data, setDataAtom],
  );
  return { ...screenContext, setData };
};

const useDeviceObserver = (): void => {
  const { setData: updateDeviceData } = useDeviceData();

  const debouncedUpdateDeviceData = useMemo(() => {
    const handleResize = (): void => {
      updateDeviceData({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    return debounce(handleResize, 100);
  }, [updateDeviceData]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(debouncedUpdateDeviceData);
    resizeObserver.observe(document.body);

    return (): void => {
      resizeObserver.disconnect();
      debouncedUpdateDeviceData.cancel(); // Cancel any pending debounced calls on cleanup
    };
  }, [debouncedUpdateDeviceData]);
};
