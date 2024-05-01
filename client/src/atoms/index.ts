import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

interface User {
  username: string;
  isStreaming?: boolean;
  roomId?: string;
}

export namespace atoms {
  export const user = atomWithStorage<User | undefined>("user", undefined);
  export const ws = atom<WebSocket | null>(null);
}
