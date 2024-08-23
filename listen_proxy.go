//go:build proxy

package main

import (
	"errors"
	"net"

	"vimagination.zapto.org/reverseproxy/unixconn"
)

func init() {
	Listen = unixconn.Listen
}
