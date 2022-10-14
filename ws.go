package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"sync"

	"golang.org/x/net/websocket"
	"vimagination.zapto.org/jsonrpc"
)

var (
	mu    sync.RWMutex
	conns = make(map[*conn]struct{})
)

type conn struct {
	Name string
	rpc  *jsonrpc.Server
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	switch method {
	case "init":
		var name string
		if err := json.Unmarshal(data, &name); err != nil {
			return nil, err
		}
		mu.Lock()
		names := []byte{'['}
		for oc := range conns {
			if oc != c {
				if oc.Name == name {
					mu.Unlock()
					return nil, ErrNameTaken
				}
				if len(names) > 1 {
					names = append(names, ',')
				}
				names = strconv.AppendQuote(names, oc.Name)
			}
		}
		mu.Unlock()
		Broadcast(c, BroadcastUserAdd, data)
		return append(json.RawMessage(names), ']'), nil
	}
	return nil, nil
}

func wsHandler(wconn *websocket.Conn) {
	var c conn
	mu.Lock()
	conns[&c] = struct{}{}
	mu.Unlock()
	c = conn{
		rpc: jsonrpc.New(wconn, &c),
	}
	c.rpc.Handle()
	if c.Name != "" {
		Broadcast(&c, BroadcastUserRemove, json.RawMessage(strconv.Quote(c.Name)))
	}
	mu.Lock()
	delete(conns, &c)
	mu.Unlock()
}

func init() {
	http.Handle("/socket", websocket.Handler(wsHandler))
}

var ErrNameTaken = errors.New("name taken")
