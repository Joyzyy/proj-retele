import { AvatarFallback } from "@radix-ui/react-avatar";
import { Avatar } from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { Label } from "@radix-ui/react-label";
import { Input } from "./components/ui/input";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { atoms } from "./atoms";
import { useSetAtom } from "jotai";

type WSMessage = {
  SessionID?: string;
  Type?: string;
  Value?: string;
};

function App() {
  const setUser = useSetAtom(atoms.user);
  const [activeStreamers, setActiveStreamers] = useState<
    | {
        RoomId: string;
        Username: string;
      }[]
    | null
  >([]);

  useEffect(() => {
    const fetchActiveStreams = async () => {
      fetch("http://[::]:8080/get_rooms", {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          setActiveStreamers(data);
        });
    };
    fetchActiveStreams();

    return () => {
      setActiveStreamers(null);
    };
  }, []);

  const handleCreateRoom = () => {
    const username = (document.getElementById("username") as HTMLInputElement)
      .value;

    if (username) {
      fetch(`http://localhost:8080/create_room`, {
        method: "POST",
        body: JSON.stringify({
          Owner: username,
        }),
      })
        .then((res) => res.json())
        .then((data: { roomId: string }) => {
          if (data) {
            setUser({
              username,
              isStreaming: true,
              roomId: data.roomId,
            });
            window.location.href = `/room/${data.roomId}`;
          }
        });
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:py-20">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <>
            <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
              Active streamers
            </h2>
            {activeStreamers?.map((streamer) => (
              <div className="grid gap-4" key={streamer.RoomId}>
                <Link to={`room/${streamer.RoomId}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="flex justify-center items-center">
                      <AvatarFallback>
                        {streamer.Username?.split(" ")[0][0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{streamer.Username}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Live</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </>
        </div>
        <div>
          <h2 className="mb-6 text-3xl font-bold tracking-right md:text-4xl">
            Become a streamer
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="Enter your unique username" />
            </div>
            <Button className="w-full" onClick={handleCreateRoom}>
              Create a room
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
