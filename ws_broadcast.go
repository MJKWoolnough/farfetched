package main

import (
	"encoding/json"
)

const (
	BroadcastUserAdd = -1 - iota
	BroadcastUserRemove
	BroadcastSDP
	BroadcastCancel
	BroadcastAccept
	BroadcastDecline
)

const broadcastStart = "{\"id\": -0,\"result\":"

func buildBroadcast(id int, data json.RawMessage) []byte {
	l := len(broadcastStart) + len(data) + 1
	dat := make([]byte, l)
	copy(dat, broadcastStart)
	copy(dat[len(broadcastStart):], data)
	id = -id
	if id > 9 {
		dat[6] = '-'
		dat[7] = byte('0' + id/10)
	}
	dat[8] = byte('0' + id%10)
	dat[l-1] = '}'
	return dat
}

func Broadcast(mc *conn, id int, data json.RawMessage) {
	mu.RLock()
	var dat json.RawMessage
	for c := range conns {
		if c != mc {
			if len(dat) == 0 {
				dat = buildBroadcast(id, data)
			}
			go c.rpc.SendData(dat)
		}
	}
	mu.RUnlock()
}
