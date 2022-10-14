package main

import (
	_ "embed" // required for index embed
	"net/http"
	"time"

	"vimagination.zapto.org/httpembed"
)

var (
	//go:embed index.gz
	indexData []byte
	index     = httpembed.HandleBuffer(indexData, 5, time.Unix(1656326999, 0))
)

func init() {
	http.Handle("/", index)
}
