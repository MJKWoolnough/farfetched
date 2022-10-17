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
	names = make(map[string]*conn)
	users = json.RawMessage{'{', '"', 'i', 'd', '"', ':', '-', '1', ',', '"', 'r', 'e', 's', 'u', 'l', 't', '"', ':', '[', ']', '}'}
)

type conn struct {
	Name     string
	Requests map[string]struct{}
	rpc      *jsonrpc.Server
}

type nameSDP struct {
	Name string          `json:"name"`
	SDP  json.RawMessage `json:"sdp"`
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	mu.RLock()
	name := c.Name
	mu.RUnlock()
	if name == "" {
		switch method {
		case "init":
			var name string
			if err := json.Unmarshal(data, &name); err != nil {
				return nil, err
			}
			if name == "" {
				return nil, ErrInvalidName
			}
			mu.Lock()
			defer mu.Unlock()
			if _, ok := names[name]; ok {
				return nil, ErrNameTaken
			}
			users = users[:len(users)-2]
			if len(users) > 20 {
				users = append(users, ',')
			}
			c.Name = name
			names[name] = c
			Broadcast(c, BroadcastUserAdd, data)
			users = append(users, data...)
			users = append(users, ']', '}')
			return nil, nil
		}
	} else {
		switch method {
		case "request":
			var nameSDP nameSDP
			if err := json.Unmarshal(data, &nameSDP); err != nil {
				return nil, err
			}
			if nameSDP.Name == "" {
				return nil, ErrInvalidName
			}
			mu.Lock()
			defer mu.Unlock()
			if _, ok := c.Requests[name]; ok {
				return nil, ErrAlreadyRequested
			}
			oc, ok := names[nameSDP.Name]
			if !ok {
				return nil, ErrNameNotFound
			}
			data = append(data[:0], "{\"name\":"...)
			data = json.RawMessage(strconv.AppendQuote(data, name))
			data = append(data, ",\"sdp\":"...)
			data = append(data, nameSDP.SDP...)
			data = append(data, '}')
			oc.rpc.SendData(buildBroadcast(BroadcastSDP, data))
			c.Requests[name] = struct{}{}
			return nil, nil
		case "cancel":
			var name string
			if err := json.Unmarshal(data, &name); err != nil {
				return nil, err
			}
			if name == "" {
				return nil, ErrInvalidName
			}
			mu.Lock()
			defer mu.Unlock()
			if _, ok := c.Requests[c.Name]; ok {
				return nil, ErrNoRequest
			}
			oc, ok := names[name]
			if !ok {
				return nil, ErrNameNotFound
			}
			delete(c.Requests, name)
			data = strconv.AppendQuote(data[:0], c.Name)
			oc.rpc.SendData(buildBroadcast(BroadcastCancel, data))
			return nil, nil
		case "accept":
			var nameSDP nameSDP
			if err := json.Unmarshal(data, &nameSDP); err != nil {
				return nil, err
			}
			if nameSDP.Name == "" {
				return nil, ErrInvalidName
			}
			mu.Lock()
			defer mu.Unlock()
			oc, ok := names[name]
			if !ok {
				return nil, ErrNameNotFound
			}
			if _, ok := oc.Requests[c.Name]; ok {
				return nil, ErrNoRequest
			}
			delete(oc.Requests, c.Name)
			data = append(data[:0], "{\"name\":"...)
			data = json.RawMessage(strconv.AppendQuote(data, name))
			data = append(data, ",\"sdp\":"...)
			data = append(data, nameSDP.SDP...)
			data = append(data, '}')
			oc.rpc.SendData(buildBroadcast(BroadcastDecline, data))
			return nil, nil
		case "decline":
			var name string
			if err := json.Unmarshal(data, &name); err != nil {
				return nil, err
			}
			if name == "" {
				return nil, ErrInvalidName
			}
			mu.Lock()
			defer mu.Unlock()
			oc, ok := names[name]
			if !ok {
				return nil, ErrNameNotFound
			}
			if _, ok := oc.Requests[c.Name]; ok {
				return nil, ErrNoRequest
			}
			delete(oc.Requests, c.Name)
			oc.rpc.SendData(buildBroadcast(BroadcastDecline, data))
			return nil, nil
		}
	}
	return nil, ErrUnknownEndpoint
}

func wsHandler(wconn *websocket.Conn) {
	var c conn
	mu.Lock()
	conns[&c] = struct{}{}
	mu.Unlock()
	c = conn{
		Requests: make(map[string]struct{}),
		rpc:      jsonrpc.New(wconn, &c),
	}
	c.rpc.SendData(users)
	c.rpc.Handle()
	mu.Lock()
	if c.Name != "" {
		delete(names, c.Name)
		Broadcast(&c, BroadcastUserRemove, json.RawMessage(strconv.Quote(c.Name)))
		users = users[:19]
		for name := range names {
			if len(names) > 20 {
				users = append(users, ',')
			}
			users = strconv.AppendQuote(users, name)
		}
		users = append(users, ']', '}')
	}
	delete(conns, &c)
	mu.Unlock()
}

func init() {
	http.Handle("/socket", websocket.Handler(wsHandler))
}

var (
	ErrNameTaken        = errors.New("name taken")
	ErrInvalidName      = errors.New("invalid name")
	ErrNameNotFound     = errors.New("name not found")
	ErrAlreadyRequested = errors.New("already requested")
	ErrNoRequest        = errors.New("no request")
	ErrUnknownEndpoint  = errors.New("unknown endpoint")
)
