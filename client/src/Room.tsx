import { useParams } from "react-router-dom";
import {useEffect, useState} from "react";
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
import { ICE_CONFIG } from "./constants";

type WSMessage = {
  RoomId: string;
  Type: string;
  Value: string;
};

const Room = () => {
  const { roomId } = useParams();
  const [user, setUser] = useAtom(atoms.user);
  // const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const newSession = async (mediaStream: MediaStream, pcs: any, ws: WebSocket, sessionId: string) => {
    console.log('new session');
    pcs[sessionId] = new RTCPeerConnection({
      iceCandidatePoolSize: 10,
      iceServers: [{
        urls: [
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302'
        ]
      }]
    });
    pcs[sessionId].onicecandidate = (e: any) => {
      console.log('debug onicecandidate: got final candidate!');
      if (!e.candidate) {
        console.log('debug on icecandidate: got final candidate');
        return;
      }
      console.log('send addcallericecandidate to websocket: ' + JSON.stringify(e.candidate));
      ws.send(JSON.stringify({
        Type: "add_caller_ice_candidate",
        SessionID: sessionId,
        Value: JSON.stringify(e.candidate)
      }));
    };

    pcs[sessionId].oniceconnectionstatechange = () => {
      console.log('oniceconnectionstatechange ' + pcs[sessionId].iceConnectionState);
      if (pcs[sessionId].iceConnectionState === 'disconnected') {
        console.log('disconnected with a peer ' + sessionId);
        pcs[sessionId].close();
        delete pcs[sessionId];
      }
    };

    mediaStream.getTracks().forEach(track => {
      pcs[sessionId].addTrack(track, mediaStream);
    });

    console.log('creating offer');
    const offer = await pcs[sessionId].createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pcs[sessionId].setLocalDescription(offer);

    console.log('send offer to websocket: ', JSON.stringify(offer));

    ws.send(JSON.stringify({
      Type: "got_offer",
      SessionID: sessionId,
      Value: JSON.stringify(offer)
    }));
  }

  useEffect(() => {
    const videoHtml = document.querySelectorAll("video")[0];

    const streamingUser = async () => {
      // create websocket
      console.log(roomId);
      const ws = new WebSocket(
          `ws://localhost:8080/ws_serve?username=${user?.username}&roomId=${user?.roomId}`
      );
      let pcs: any = {};
      let mediaStream: MediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: true
      });
      videoHtml.srcObject = mediaStream;
      ws.onopen = () => {
        console.log("successfully opened websocket connection")
      };
      ws.onclose = () => console.log("closed websocket connection");
      ws.onerror = (e) => {
        console.error("err: ", e);
        ws.close();
      };
      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data) as any;

        if (data.Type === "beat") {
          console.log("conn kept alive");
        } else if (data.Type === "new_room") {
          console.log("created the new room");
        } else if (data.Type === "new_session") {
          await newSession(mediaStream, pcs, ws, data.SessionID);
        } else if (data.Type === "add_callee_ice_candidate") {
          console.log('add callee ice candidate: ', JSON.parse(data.Value));
          pcs[data.SessionID].addIceCandidate(JSON.parse(data.Value));
        } else if (data.Type === "got_answer") {
          console.log('got_answer: ', data);
          pcs[data.SessionID].setRemoteDescription(new RTCSessionDescription(JSON.parse(data.Value)));
        } else {
          console.log('ws type: ', data);
          console.error("unidentified ws type, closing ws");
          ws.close();
        }
      };
    };

    const nonStreamingUser = async () => {
      // user joined
      console.log("initiate media: set remote source");
      const clientMediaStream = new MediaStream();
      videoHtml.srcObject = clientMediaStream;
      console.log("initiate websocket");
      const ws = new WebSocket(`ws://localhost:8080/ws_connect?id=${roomId}`);
      let pc: RTCPeerConnection | null = null;
      let sessionID: string | undefined;
      ws.onerror = () => {
        console.error('ws error!');
      }
      ws.onopen = () => console.log('connected to websocket');
      ws.onmessage = async (e) => {
        const jsonData = JSON.parse(e.data) as any;
        if (jsonData.Type === "beat") {
          console.log("keeping conn alive");
        } else if (jsonData.Type === "new_session") {
          sessionID = jsonData.SessionID;
          pc = new RTCPeerConnection({
            iceCandidatePoolSize: 10,
            iceServers: [{
              urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302'
              ]
            }]
          });
          pc.onicecandidate = (e) => {
            console.log('debug candidate: ' + JSON.stringify(e.candidate));
            if (!e.candidate) {
              console.log('debug onicecandidate: got final candidate!');
              return;
            }
            console.log('send addCalleeIceCandidate to ws: ' + JSON.stringify(e.candidate));
            ws.send(JSON.stringify({
              Type: "add_callee_ice_candidate",
              SessionID: sessionID,
              Value: JSON.stringify(e.candidate)
            }));
          };
          pc.oniceconnectionstatechange = () => {
            console.log('pc.oniceconnectionstatechange ' + pc?.iceConnectionState);
            if (pc?.iceConnectionState === 'disconnected') {
              console.log('disconnected with peer');
              pc.close();
              pc = null;
            }
          }
          pc.ontrack = (ev) => {
            console.log('im here!');
            clientMediaStream?.addTrack(ev.track);
            console.info('clientMediaStream: ', clientMediaStream);
            videoHtml.srcObject = clientMediaStream;
            try {
              videoHtml.play();
            } catch {}
          }
        } else if (jsonData.Type === "got_offer") {
          console.log("debug: got offer");
          if (sessionID !== jsonData.SessionID) return;
          await pc?.setRemoteDescription(new RTCSessionDescription(JSON.parse(jsonData.Value)));
          console.log('create answer');
          const answer = await pc?.createAnswer();
          await pc?.setLocalDescription(answer);
          console.log('send answer to ws: ' + JSON.stringify(answer));
          ws.send(JSON.stringify({
            Type: "got_answer",
            SessionID: jsonData.SessionID,
            Value: JSON.stringify(answer)
          }));
        } else if (jsonData.Type === "add_caller_ice_candidate") {
          console.log('add caller ice candidate');
          if (sessionID !== jsonData.SessionID) return;
          pc?.addIceCandidate(JSON.parse(jsonData.Value));
        } else if (jsonData.Type === "room_not_found") {
          console.log('room not found');
        } else if (jsonData.Type === "room_closed") {
          console.log("room closed!");
        }
      }
    }

    if (user?.isStreaming) {
      streamingUser();
    } else if (user && !user.isStreaming && roomId) {
      console.log('getting called!');
      nonStreamingUser();
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
                const usernameInput = document.getElementById("username") as HTMLInputElement;
                if (usernameInput && usernameInput.value) {
                  setUser({
                    username: usernameInput.value,
                    isStreaming: false
                  });
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
      <video id="preview" width="1280" height="720" autoPlay muted></video>
    </>
  );
};

export default Room;
