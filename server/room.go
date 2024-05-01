package main

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type StreamSession struct {
	ID                  string
	Offer               string
	Answer              string
	CallerIceCandidates []string
	CalleeIceCandidates []string
	CallerConn          *websocket.Conn
	CalleeConn          *websocket.Conn
}

type Room struct {
	ID         string
	User       string
	Sessions   map[string]*StreamSession
	CallerConn *websocket.Conn
}

var roomMap = make(map[string]*Room)

func GetAllRooms() []struct {
	RoomId   string
	Username string
} {
	var retval []struct {
		RoomId   string
		Username string
	}
	if len(roomMap) > 0 {
		for _, room := range roomMap {
			retval = append(retval, struct {
				RoomId   string
				Username string
			}{
				RoomId:   room.ID,
				Username: room.User,
			})
		}
	}
	return retval
}

func (room *Room) GetSession(id string) *StreamSession {
	return room.Sessions[id]
}

func (room *Room) NewSession(calleeConn *websocket.Conn) *StreamSession {
	session := StreamSession{
		ID:                  fmt.Sprintf("%s#%s", room.ID, uuid.NewString()),
		CallerIceCandidates: []string{},
		CalleeIceCandidates: []string{},
		CallerConn:          room.CallerConn,
		CalleeConn:          calleeConn,
	}
	room.Sessions[session.ID] = &session
	return &session
}

func GetRoom(id string) *Room {
	return roomMap[id]
}

func NewRoom(username string) string {
	room := Room{
		ID:       uuid.NewString(),
		Sessions: make(map[string]*StreamSession),
		User:     username,
	}
	roomMap[room.ID] = &room
	return room.ID
}

func SetCallerConn(callerConn *websocket.Conn, roomId string) *Room {
	room := GetRoom(roomId)
	room.CallerConn = callerConn
	return room
}

func RemoveRoom(id string) {
	roomMap[id] = nil
}
