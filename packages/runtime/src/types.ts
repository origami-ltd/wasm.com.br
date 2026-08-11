/** Minimal typings for the bits of the emscripten runtime a game page actually touches.
    Games extend EmscriptenModule with their own `_Foo` exports. */

export interface FSStream {
  position: number;
}

export interface FSNode {
  stream_ops: {
    llseek: (stream: FSStream, offset: number, whence: number) => number;
    read: (
      stream: FSStream,
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number,
    ) => number;
  };
}

export interface EmscriptenFS {
  mkdirTree: (path: string) => void;
  createFile: (
    parent: string,
    name: string,
    properties: object,
    canRead: boolean,
    canWrite: boolean,
  ) => FSNode;
  readFile: (path: string, options: { encoding: "utf8" }) => string;
  writeFile: (path: string, data: string | Uint8Array) => void;
  stat: (path: string) => unknown;
  mount: (type: unknown, options: object, path: string) => void;
  chdir: (path: string) => void;
  syncfs: (populate: boolean, callback: (error?: unknown) => void) => void;
  ErrnoError: new (code: number) => Error;
}

export interface EmscriptenModule {
  FS: EmscriptenFS;
  IDBFS: unknown;
  canvas: HTMLCanvasElement;
  addRunDependency: (id: string) => void;
  removeRunDependency: (id: string) => void;
  ccall?: (name: string, ret: string | null, types: string[], args: unknown[]) => number;
}

export type ModuleFactory<M extends EmscriptenModule = EmscriptenModule> =
  (config: Record<string, unknown>) => Promise<M>;
