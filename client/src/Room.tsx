import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { atoms } from "./atoms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

type WSMessage = {
  RoomId: string;
  Type: string;
  Value: string;
};

const Room = () => {
  const { roomId } = useParams();
  const [user, setUser] = useAtom(atoms.user);

  useEffect(() => {
    if (user?.isStreaming) {
      // create websocket
      const ws = new WebSocket(
        `ws://localhost:8080/ws_serve?username=${user.username}&roomId=${user.roomId}`
      );
      ws.onopen = () => console.log("successfully opened websocket connection");
      ws.onclose = () => console.log("closed websocket connection");
      ws.onerror = (e) => {
        console.error("err: ", e);
        ws.close();
      };
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data) as WSMessage;

        if (data.Type === "beat") {
          console.log("conn kept alive");
        } else if (data.Type === "new_session") {
          console.log("new session");
        } else if (data.Type === "add_callee_ice_candidate") {
          console.log("add callee ice candidate");
        } else if (data.Type === "got_answer") {
          console.log("got answer");
        } else {
          console.error("unidentified ws type, closing ws");
          ws.close();
        }
      };
      const videoHtml = document.querySelectorAll("video")[0];
      navigator.mediaDevices
        .getDisplayMedia({
          audio: true,
          video: true,
        })
        .then((stream) => {
          console.log("stream: ", stream);
          const videoTracks = stream.getVideoTracks();
          console.log(`Using video device: ${videoTracks[0].label}`);
          videoHtml.srcObject = stream;
        })
        .catch((error) => {
          console.error(error);
        });
    } else if (user && !user.isStreaming) {
      const ws_client = new WebSocket(
        `ws://localhost:8080/ws_connect?id=${roomId}`
      );
      ws_client.onopen = () => {
        console.log("opened connection");
      };
      ws_client.onerror = () => {
        console.error("there was an error");
      };
      ws_client.onmessage = (msg) => {
        const data = JSON.parse(msg as any);

        console.log("data ws_client: ", data);
      };
    }
  }, [user]);

  if (!user) {
    return (
      <Dialog open={!user}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before we continue</DialogTitle>
            <DialogDescription>
              We need you need to set your username!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                placeholder="Enter your beautiful username here!"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const usernameInput = document.getElementById("username");
                if (usernameInput && (usernameInput as any).value) {
                  setUser((usernameInput as any).value);
                }
              }}
            >
              Join
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <>
      {roomId}
      <video id="preview" width="500" height="500" autoPlay muted></video>
    </>
  );
};

export default Room;
