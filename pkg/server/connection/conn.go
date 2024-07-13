package connection

import (
	"sync"

	"github.com/gorilla/websocket"
)

var (
	ConnLock = &sync.RWMutex{}

	ConnMap = map[string]*websocket.Conn{}
)

func SetConn(taskID string, conn *websocket.Conn) {
	ConnLock.Lock()
	defer ConnLock.Unlock()
	ConnMap[taskID] = conn
}

func RemoveConn(taskID string) {
	ConnLock.Lock()
	defer ConnLock.Unlock()
	delete(ConnMap, taskID)
}

func CloseConn(taskID string) {
	ConnLock.RLock()
	defer ConnLock.RUnlock()

	if conn, ok := ConnMap[taskID]; ok {
		conn.Close()
	}
}
