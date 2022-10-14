package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %s", err)
	}
}

func run() error {
	p := flag.Uint("p", 8080, "server port")
	flag.Parse()
	l, err := Listen("tcp", fmt.Sprintf(":%d", *p))
	if err != nil {
		return errors.New("unable to open port 80")
	}
	server := &http.Server{
		Handler: http.DefaultServeMux,
	}

	errc := make(chan error)
	go func() {
		if err := server.Serve(l); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		} else {
			errc <- nil
		}
	}()

	sc := make(chan os.Signal, 1)
	signal.Notify(sc, os.Interrupt)
	<-sc
	signal.Stop(sc)
	close(sc)

	server.Shutdown(context.Background())
	return <-errc
}
