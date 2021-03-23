import { useState } from "react";

export interface RemoteModule {
  get: (name: string) => () => unknown;
  init: (scope: unknown) => void;
}
export interface RemoteContainerRequest {
  name: string;
  url: string;
}

export interface RemoteContainerRequestOptions {
  heal?: boolean;
  scriptTimeout?: number;
}

export const loadRemoteContainer = async (name: string) => {
  // @ts-ignore
  const container = (window[name] as any) as RemoteModule;
  if (!container) {
    throw new Error(`No remote named ${name} found`);
  } else {
    await container.init(__webpack_share_scopes__.default);
    return container;
  }
};

export const initSharing = async () =>
  await __webpack_init_sharing__("default");

export const loadRemoteExport = async <T>(args: {
  moduleId: string;
  exportId: string;
  raw?: boolean;
}): Promise<T | undefined> => {
  const { moduleId, exportId, raw } = args;
  const container = await loadRemoteContainer(moduleId);
  const factory = await container.get(exportId);
  const Module = factory();
  if (!raw) {
    return Module as T;
  } else {
    const rawValue = (Module as any) as { default: T };
    return rawValue.default;
  }
};

export const outputFailure = (error: string, heal: boolean) => {
  if (heal) {
    console.log(error);
  } else {
    throw Error(error);
  }
};

const dynamicScriptsCache: Record<string, HTMLScriptElement> = {};
export const insertDynamicContainers = (
  requests: Array<RemoteContainerRequest>,
  userOptions?: RemoteContainerRequestOptions
) => {
  const options = {
    ...userOptions,
    heal: true,
  };
  const validRequests = requests.reduce(
    (
      accumulator: Array<RemoteContainerRequest>,
      currentValue: RemoteContainerRequest
    ) => {
      const invalidProtocol =
        location.protocol === "https" && !currentValue.url.startsWith("https");
      const inCache = dynamicScriptsCache[currentValue.url];
      if (!invalidProtocol && !inCache) {
        accumulator.push(currentValue);
      } else if (invalidProtocol) {
        outputFailure(`Script Protocol Not Https: ${currentValue.name} at ${currentValue.url} `, options.heal)
      }
      return accumulator;
    },
    []
  );

  const dynamicContainersPromises = validRequests.map((config) => {
    const scriptMountPromise = new Promise<RemoteContainerRequest>(
      (resolve, reject) => {
        const element = document.createElement("script");
        element.src = config.url;
        element.type = "text/javascript";
        element.async = true;

        const remoteLoadTimeout = setTimeout(() => {
          reject(config);
          clearTimeout(remoteLoadTimeout);
        }, 1000);

        element.onload = () => {
          clearTimeout(remoteLoadTimeout);
          dynamicScriptsCache[config.url] = element;
          resolve(config);
        };

        document.head.appendChild(element);
      }
    );
    return scriptMountPromise;
  });

  return Promise.allSettled(dynamicContainersPromises);
};

export const removeRemoteContainers = () => {
  Object.keys(dynamicScriptsCache).forEach((url: string) => {
    const element = dynamicScriptsCache[url];
    console.log(`Dynamic Script Removed: ${element.src}`);
    document.head.removeChild(element);
    delete dynamicScriptsCache[url];
  });
};

const getValidReturnValues = <T>(output: PromiseSettledResult<T>[]) => {
  return output.reduce(
    (accumulator: T[], currentValue: PromiseSettledResult<T>) => {
      if (currentValue.status === "fulfilled") {
        accumulator.push(currentValue.value);
      }
      return accumulator;
    },
    []
  );
};

export const useRemoteContainers = async (
  remotes: Array<RemoteContainerRequest>,
  userOptions?: RemoteContainerRequestOptions
) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [configs, setConfigs] = useState<RemoteContainerRequest[]>([])
 insertDynamicContainers(remotes).then((data) => {
    const configs = getValidReturnValues<RemoteContainerRequest>(data);
    setConfigs(configs);
    setLoading(false)
 })
  await initSharing();
 return { loading, configs }
};
