declare global {
  interface Window {
    runtime: {
      EventsOn: (eventName: string, callback: (...data: any) => void) => () => void;
      EventsOnMultiple: (eventName: string, callback: (...data: any) => void, maxCallbacks: number) => () => void;
      EventsOnce: (eventName: string, callback: (...data: any) => void) => () => void;
      EventsOff: (eventName: string, ...additionalEventNames: string[]) => void;
      EventsOffAll: () => void;
      EventsEmit: (eventName: string, ...data: any) => void;
      LogPrint: (message: string) => void;
      LogTrace: (message: string) => void;
      LogDebug: (message: string) => void;
      LogInfo: (message: string) => void;
      LogWarning: (message: string) => void;
      LogError: (message: string) => void;
      LogFatal: (message: string) => void;
      WindowReload: () => void;
      WindowReloadApp: () => void;
      WindowSetAlwaysOnTop: (b: boolean) => void;
      WindowSetSystemDefaultTheme: () => void;
      WindowSetLightTheme: () => void;
      WindowSetDarkTheme: () => void;
      WindowCenter: () => void;
      WindowSetTitle: (title: string) => void;
      WindowFullscreen: () => void;
      WindowUnfullscreen: () => void;
      WindowIsFullscreen: () => Promise<boolean>;
      WindowSetSize: (width: number, height: number) => void;
      WindowGetSize: () => Promise<Size>;
      WindowSetMaxSize: (width: number, height: number) => void;
      WindowSetMinSize: (width: number, height: number) => void;
      WindowSetPosition: (x: number, y: number) => void;
      WindowGetPosition: () => Promise<Position>;
      WindowHide: () => void;
      WindowShow: () => void;
      WindowMaximise: () => void;
      WindowToggleMaximise: () => void;
      WindowUnmaximise: () => void;
      WindowIsMaximised: () => Promise<boolean>;
      WindowMinimise: () => void;
      WindowUnminimise: () => void;
      WindowIsMinimised: () => Promise<boolean>;
      WindowIsNormal: () => Promise<boolean>;
      WindowSetBackgroundColour: (R: number, G: number, B: number, A: number) => void;
      ScreenGetAll: () => Promise<Screen[]>;
      BrowserOpenURL: (url: string) => void;
      Environment: () => Promise<EnvironmentInfo>;
      Quit: () => void;
      Hide: () => void;
      Show: () => void;
      ClipboardGetText: () => Promise<string>;
      ClipboardSetText: (text: string) => Promise<boolean>;
      OnFileDrop: (callback: (x: number, y: number, paths: string[]) => void, useDropTarget: boolean) => void;
      OnFileDropOff: () => void;
      CanResolveFilePaths: () => boolean;
      ResolveFilePaths: (files: File[]) => void;
    };
  }
}

export {};