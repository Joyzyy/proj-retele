package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/cors"
)

type Message struct {
	SessionID string
	Type      string
	Value     string
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func checkConnection(ticker *time.Ticker, conn *websocket.Conn, quit chan struct{}) {
	fmt.Println("Checking connection")
	for {
		select {
		case <-ticker.C:
			_ = conn.WriteJSON(Message{
				Type: "beat",
			})
		case <-quit:
			log.Println("connection closed")
			return
		}
	}
}

func main() {
	router := http.NewServeMux()

	router.HandleFunc("GET /ws_serve", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("upgrade error: %s", err)
			return
		}
		username, ok := r.URL.Query()["username"]
		if !ok || username[0] == "" {
			return
		}
		roomId, ok := r.URL.Query()["roomId"]
		if !ok || roomId[0] == "" {
			return
		}

		room := SetCallerConn(conn, roomId[0])
		if err = conn.WriteJSON(Message{
			SessionID: "",
			Type:      "new_room",
			Value:     "",
		}); err != nil {
			log.Println("newSessionWriteJsonError", err)
			return
		}

		go func(r *Room) {
			ticker := time.NewTicker(10 * time.Second)
			fmt.Println("ticker: ", ticker)
			quit := make(chan struct{})
			defer func() {
				ticker.Stop()
				_ = room.CallerConn.Close()
				close(quit)
				RemoveRoom(r.ID)
				for sessionId, streamSession := range r.Sessions {
					_ = streamSession.CalleeConn.WriteJSON(Message{
						Type:      "room_closed",
						SessionID: sessionId,
					})
				}
			}()

			go checkConnection(ticker, conn, quit)

			defer room.CallerConn.Close()

			for {
				var msg Message
				if err := room.CallerConn.ReadJSON(&msg); err != nil {
					log.Println("websocket error", err)
					return
				}

				s := room.GetSession(msg.SessionID)
				if s == nil {
					log.Println("session nil.", msg.SessionID)
				}

				if msg.Type == "add_caller_ice_candidate" {
					s.CallerIceCandidates = append(s.CallerIceCandidates, msg.Value)
				} else if msg.Type == "got_offer" {
					s.Offer = msg.Value
				}

				if err := s.CalleeConn.WriteJSON(msg); err != nil {
					log.Println("serveEchoWriteJsonError.", err)
				}
			}
		}(room)
	})

	router.HandleFunc("GET /ws_connect", func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)

		ids, ok := r.URL.Query()["id"]
		if !ok || ids[0] == "" {
			return
		}

		room := GetRoom(ids[0])
		if room == nil {
			_ = conn.WriteJSON(Message{
				Type: "room_not_found",
			})
			return
		}

		session := room.NewSession(conn)
		if err := room.CallerConn.WriteJSON(Message{
			SessionID: session.ID,
			Type:      "new_session",
			Value:     session.ID,
		}); err != nil {
			log.Println("callerWriteJsonError", err)
			return
		}

		if err := conn.WriteJSON(Message{
			SessionID: session.ID,
			Type:      "new_session",
			Value:     session.ID,
		}); err != nil {
			log.Println("calleeWriteJsonError", err)
			return
		}

		go func(streamSession *StreamSession) {
			defer streamSession.CalleeConn.Close()
			for {
				var msg Message
				if err := conn.ReadJSON(&msg); err != nil {
					log.Println("websocketErr", err)
					return
				}
				if msg.SessionID == streamSession.ID {
					if msg.Type == "add_callee_ice_candidate" {
						streamSession.CalleeIceCandidates = append(streamSession.CalleeIceCandidates, msg.Value)
					} else if msg.Type == "got_answer" {
						streamSession.Answer = msg.Value
					}

					if err := streamSession.CallerConn.WriteJSON(msg); err != nil {
						log.Println("connectEchoWriteJsonError", err)
					}
				}
			}
		}(session)
	})

	router.HandleFunc("POST /create_room", func(w http.ResponseWriter, r *http.Request) {
		var BodyData struct {
			Owner string `json:"owner"`
		}

		body, err := io.ReadAll(r.Body)
		if err != nil {
			log.Fatal("err: ", err)
			return
		}

		if err := json.Unmarshal(body, &BodyData); err != nil {
			log.Fatal("failed to unmarshal: ", err)
			return
		}

		roomId := NewRoom(BodyData.Owner)
		res := struct {
			RoomId string `json:"roomId"`
		}{
			RoomId: roomId,
		}

		jsonify, err := json.Marshal(res)
		if err != nil {
			log.Fatal("err: ", err)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(jsonify)
	})

	router.HandleFunc("GET /get_rooms", func(w http.ResponseWriter, r *http.Request) {
		jsonify, _ := json.Marshal(GetAllRooms())
		w.Write(jsonify)
	})

	handler := cors.Default().Handler(router)
	server := &http.Server{
		Addr:    "[::]:8080",
		Handler: handler,
	}
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("error while serving server: %v", err)
	}
}
