#!/bin/bash
export GOGC=off
export GOMEMLIMIT=384MiB
export GODEBUG=gctrace=1
export GOMAXPROCS=12
#export GIN_MODE=release
#to support differen libc versions
export CGO_ENABLED=0
#echo $GOGC $GOMEMLIMIT $GODEBUG $CGO_ENABLED
#go build -toolexec=/bin/time
#./react-and-go
go run main.go
