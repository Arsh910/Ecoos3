package room

import (
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	roomCodeChars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	roomCodeLength = 6
	maxRoomMembers = 4 // more than this won't work as of design constraints
)

var (
	ErrRoomFull     = errors.New("room is full")
	ErrRoomNotFound = errors.New("room not found")
)

type Peer struct {
	ID    string
	Alias string
	Conn  *websocket.Conn
	mu    sync.Mutex
}

type Room struct {
	Code    string
	peers   map[string]*Peer
	emptyAt time.Time
	mu      sync.Mutex
}

type RoomManger struct {
	mu    sync.Mutex
	rooms map[string]*Room
}

func (p *Peer) Send(v any) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return p.Conn.WriteJSON(v)
}

func (p *Peer) Ping() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return p.Conn.WriteMessage(websocket.PingMessage, nil)
}

func NewRoomManager() *RoomManger {
	return &RoomManger{
		rooms: make(map[string]*Room),
	}
}

func IsValidCode(code string) bool {
	if len(code) != roomCodeLength {
		return false
	}
	for _, r := range code {
		if !strings.ContainsRune(roomCodeChars, r) {
			return false
		}
	}
	return true
}

func GenerateRoomCode() string {
	b := make([]byte, roomCodeLength)

	// cryptographically random bytes
	rand.Read(b)

	code := make([]byte, roomCodeLength)
	for i, v := range b {
		code[i] = roomCodeChars[int(v)%len(roomCodeChars)]
	}
	return string(code)
}

func (rm *RoomManger) Count() int {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	return len(rm.rooms)
}

func (rm *RoomManger) CreateRoom() *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	var code string
	for {
		code = GenerateRoomCode()
		if _, exsists := rm.rooms[code]; !exsists {
			break
		}
	}

	room := &Room{
		Code:  code,
		peers: make(map[string]*Peer),
	}

	rm.rooms[code] = room
	log.Println("room created:", code)
	return room
}

func (rm *RoomManger) EnsureRoom(code string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, ok := rm.rooms[code]; ok {
		room.mu.Lock()
		room.emptyAt = time.Time{}
		room.mu.Unlock()
		return room
	}

	room := &Room{Code: code, peers: make(map[string]*Peer)}
	rm.rooms[code] = room
	return room
}

func (rm *RoomManger) GetRoom(code string) (*Room, error) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[code]

	if !exists {
		return nil, ErrRoomNotFound
	}

	return room, nil
}

func (rm *RoomManger) RemoveRoomIfEmpty(code string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	room, exists := rm.rooms[code]

	if !exists {
		return
	}

	room.mu.Lock()
	if len(room.peers) == 0 && room.emptyAt.IsZero() {
		room.emptyAt = time.Now()
		log.Println("room removed, grace period started: ", code)
	}
	room.mu.Unlock()
}

func (rm *RoomManger) StartSweeper(ttl time.Duration) {
	go func() {
		for range time.Tick(time.Minute) {
			rm.mu.Lock()
			for code, room := range rm.rooms {
				room.mu.Lock()
				expired := len(room.peers) == 0 &&
					!room.emptyAt.IsZero() &&
					time.Since(room.emptyAt) > ttl
				room.mu.Unlock()
				if expired {
					delete(rm.rooms, code)
					log.Println("room expired:", code)
				}
			}
			rm.mu.Unlock()
		}
	}()
}

func (r *Room) JoinRoom(peer *Peer) error {
	r.mu.Lock()

	old, isReconnect := r.peers[peer.ID]

	if !isReconnect && len(r.peers) >= maxRoomMembers {
		r.mu.Unlock()
		return ErrRoomFull
	}

	exsisting := make([]map[string]string, 0, len(r.peers))
	targets := make([]*Peer, 0, len(r.peers))

	for id, p := range r.peers {
		if id == peer.ID {
			continue
		}
		exsisting = append(exsisting, map[string]string{"id": p.ID, "alias": p.Alias})
		targets = append(targets, p)
	}

	r.peers[peer.ID] = peer
	r.emptyAt = time.Time{}
	r.mu.Unlock()

	if isReconnect && old.Conn != peer.Conn {
		old.Conn.Close()
		fmt.Println("replaced stale connection for peer: ", peer.ID)
	}

	peer.Send(map[string]any{
		"type":  "peers",
		"peers": exsisting,
		"self":  peer.ID,
	})

	for _, p := range targets {
		p.Send(map[string]any{
			"type":   "peer-joined",
			"peerId": peer.ID,
			"alias":  peer.Alias,
		})
	}

	log.Println("peer joined room", r.Code, "| Total peers: ", len(targets)+1)

	return nil
}

func (r *Room) RouteTo(targetID string, msg []byte) {
	r.mu.Lock()
	target, ok := r.peers[targetID]
	r.mu.Unlock()

	if !ok {
		return
	}

	target.mu.Lock()

	target.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	target.Conn.WriteMessage(websocket.TextMessage, msg)

	target.mu.Unlock()
}

func (r *Room) LeaveRoom(peerId string, conn *websocket.Conn) {
	r.mu.Lock()

	current, ok := r.peers[peerId]
	if !ok || current.Conn != conn {
		r.mu.Unlock()
		return // already replaced by a newer connection
	}

	delete(r.peers, peerId)
	remaining := make([]*Peer, 0, len(r.peers))

	for _, p := range r.peers {
		remaining = append(remaining, p)
	}
	r.mu.Unlock()

	for _, p := range remaining {
		p.Send(map[string]any{
			"type":   "peer-left",
			"peerId": peerId,
		})
	}

	log.Println("peer left room", r.Code, "| total peers: ", len(remaining))
}
